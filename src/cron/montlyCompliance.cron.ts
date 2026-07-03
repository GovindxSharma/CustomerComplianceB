import cron from "node-cron";
import { generateCurrentMonthComplianceForAllClients } from "../helpers/monthlyCompliance.helper";

/**
 * Schedules the monthly compliance record creation cron.
 *
 * Schedule: 00:05 daily (only processes on the last day of the month for the current month).
 *
 * If you need to test immediately without waiting for the last day, temporarily
 * change the schedule to "* * * * *" (every minute), run once, then revert.
 */
export const monthlyComplianceCron = () => {
  // Fire at 00:05 daily, but only run the record generation if today is the last day of the month
  cron.schedule("5 0 * * *", async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // If tomorrow's month is same as today's month, it's not the last day of the month
    if (tomorrow.getMonth() === today.getMonth()) {
      return;
    }

    const startedAt = new Date();
    console.log(`[Compliance Cron] 🕛 Started at ${startedAt.toISOString()}`);

    try {
      const summary = await generateCurrentMonthComplianceForAllClients();
      console.log(
        `[Compliance Cron] ✅ Finished — ` +
          `created: ${summary.created}, ` +
          `already existed: ${summary.exists}, ` +
          `skipped (inactive): ${summary.skipped}, ` +
          `failed: ${summary.failed}`,
      );

      if (summary.failed > 0) {
        console.warn(
          `[Compliance Cron] ⚠️  ${summary.failed} client(s) failed — check logs above for details.`,
        );
      }
    } catch (err) {
      // This only fires if something catastrophic happens (e.g. DB is down)
      // before we even start iterating clients.
      console.error("[Compliance Cron] ❌ Fatal error — cron aborted:", err);
    }
  });

  console.log(
    "[Compliance Cron] 📅 Scheduled for 00:05 daily (checks for last day of month)",
  );
};
