import { MonthlyCompliance } from "../models/monthlyCompliance.model";
import mongoose from "mongoose";

export const generateMonthlyComplianceRecordsForClient = async (
  clientId: mongoose.Types.ObjectId,
  startMonth: number,
  startYear: number
) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let year = startYear;
    let month = startMonth;

    while (
      year < currentYear ||
      (year === currentYear && month <= currentMonth)
    ) {
      await MonthlyCompliance.updateOne(
        {
          client_id: clientId,
          month: month.toString().padStart(2, "0"),
          year,
        },
        {
          $setOnInsert: {
            client_id: clientId,
            month: month.toString().padStart(2, "0"),
            year,
            category_id: null,
            dataReceiveStatus: "Not Received",
            workProgress: "Not Started",
            billStatus: "Pending",
          },
        },
        { upsert: true }
      );

      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }

    console.log(
      "✅ Monthly compliance backfill completed for client:",
      clientId
    );
  } catch (err) {
    console.error(
      "❌ Error in generateMonthlyComplianceRecordsForClient:",
      err
    );
  }
};
