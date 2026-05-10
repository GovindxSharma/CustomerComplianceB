import cron from "node-cron";
import { generateNextMonthComplianceForAllClients } from "../helpers/monthlyCompliance.helper";

/**
 * Schedules the monthly compliance record creation cron.
 *
 * Schedule: 00:05 on the 1st of every month  →  "5 0 1 * *"
 *
 * If you need to test immediately without waiting for the 1st, temporarily
 * change the schedule to "* * * * *" (every minute), run once, then revert.
 */
export const monthlyComplianceCron = () => {
  // Fire at 00:05 on the 1st of every month
  cron.schedule("5 0 1 * *", async () => {
    const startedAt = new Date();
    console.log(`[Compliance Cron] 🕛 Started at ${startedAt.toISOString()}`);

    try {
      const summary = await generateNextMonthComplianceForAllClients();
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
    "[Compliance Cron] 📅 Scheduled for 00:05 on the 1st of every month",
  );
};
