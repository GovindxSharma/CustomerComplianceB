import mongoose from "mongoose";
import { MonthlyCompliance } from "../models/monthlyCompliance.model";
import { Client } from "../models/client.model";

// ─── Shared defaults ──────────────────────────────────────────────────────────
const DEFAULT_RECORD = {
  dataReceiveStatus: "Not Received" as const,
  workProgress: "Not Started" as const,
  billStatus: "Pending" as const,
  workersAsPerData: 0,
  expectedBill: 0,
  actualBill: 0,
};

// ─── Internal: safe upsert for a single month/year ───────────────────────────
/**
 * Creates one MonthlyCompliance record if it doesn't already exist.
 * Returns 'created' | 'exists'. Throws on any non-duplicate error.
 */
const upsertOneRecord = async (
  clientId: mongoose.Types.ObjectId,
  month: string, // zero-padded, e.g. "03"
  year: number,
): Promise<"created" | "exists"> => {
  const exists = await MonthlyCompliance.findOne(
    { client_id: clientId, month, year },
    { _id: 1 },
  ).lean();

  if (exists) return "exists";

  try {
    await MonthlyCompliance.create({
      client_id: clientId,
      month,
      year,
      // category_id intentionally omitted — schema default (null) handles it,
      // avoiding explicit-null ref-field issues across Mongoose versions.
      ...DEFAULT_RECORD,
    });
    return "created";
  } catch (err: any) {
    if (err?.code === 11000) return "exists"; // lost a race — record is there
    throw err;
  }
};

// ─── 1. BACKFILL ──────────────────────────────────────────────────────────────
/**
 * Called when a new client is created.
 * Generates one MonthlyCompliance record for every month from
 * (startMonth / startYear) up to and including the current month.
 *
 * Example: client starts March 2024, today is May 2025
 *   → creates records for 03/2024 … 05/2025  (15 records)
 */
export const generateMonthlyComplianceRecordsForClient = async (
  clientId: mongoose.Types.ObjectId,
  startMonth: number, // 1-indexed, e.g. 3 for March
  startYear: number,
): Promise<void> => {
  const today = new Date();
  const endMonth = today.getMonth() + 1; // 1-indexed
  const endYear = today.getFullYear();

  let m = startMonth;
  let y = startYear;

  while (y < endYear || (y === endYear && m <= endMonth)) {
    const paddedMonth = m.toString().padStart(2, "0");

    try {
      await upsertOneRecord(clientId, paddedMonth, y);
    } catch (err) {
      // Log but continue — one bad month shouldn't abort the whole backfill
      console.error(
        `[Compliance Helper] ❌ Failed to create record ${paddedMonth}/${y} for client ${clientId}:`,
        err,
      );
    }

    // Advance to next month
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
};

// ─── 2. NEXT-MONTH (used by cron) ────────────────────────────────────────────
/**
 * Computes next calendar month relative to a given date.
 * Exported for unit testing.
 */
export const getNextMonthYear = (from: Date = new Date()) => {
  let month = from.getMonth() + 2; // 0-indexed + 1 (current) + 1 (next) = +2
  let year = from.getFullYear();
  if (month > 12) {
    month = 1;
    year++;
  }
  return { month, year };
};

/**
 * Creates the next month's MonthlyCompliance record for a single active client.
 * Called per-client from the cron runner.
 *
 * Returns: 'created' | 'exists' | 'skipped'
 */
export const generateNextMonthComplianceForClient = async (
  clientId: mongoose.Types.ObjectId,
  referenceDate: Date = new Date(),
  overrideMonth?: number,
  overrideYear?: number,
): Promise<"created" | "exists" | "skipped"> => {
  // Confirm client still exists and is active
  const client = await Client.findById(clientId, { status: 1 }).lean();
  if (!client || client.status !== "Active") return "skipped";

  let month: number;
  let year: number;

  if (overrideMonth && overrideYear) {
    month = overrideMonth;
    year = overrideYear;
  } else {
    const nextMonthYear = getNextMonthYear(referenceDate);
    month = nextMonthYear.month;
    year = nextMonthYear.year;
  }

  const paddedMonth = month.toString().padStart(2, "0");

  try {
    return await upsertOneRecord(clientId, paddedMonth, year);
  } catch (err) {
    throw err; // caller (cron runner) handles per-client errors
  }
};

/**
 * Runs generateNextMonthComplianceForClient for every active client.
 * Called by the cron job and the manual admin trigger route.
 */
export const generateNextMonthComplianceForAllClients = async (
  referenceDate: Date = new Date(),
  overrideMonth?: number,
  overrideYear?: number,
): Promise<{
  created: number;
  exists: number;
  skipped: number;
  failed: number;
}> => {
  const summary = { created: 0, exists: 0, skipped: 0, failed: 0 };

  const clients = await Client.find({ status: "Active" }, { _id: 1 }).lean();
  console.log(`[Compliance Cron] Processing ${clients.length} active clients…`);

  for (const client of clients) {
    try {
      const result = await generateNextMonthComplianceForClient(
        client._id as mongoose.Types.ObjectId,
        referenceDate,
        overrideMonth,
        overrideYear,
      );
      summary[result]++;
    } catch (err) {
      summary.failed++;
      console.error(
        `[Compliance Cron] ❌ Failed for client ${client._id}:`,
        err,
      );
    }
  }

  return summary;
};
