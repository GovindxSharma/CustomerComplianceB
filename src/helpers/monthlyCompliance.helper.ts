import { MonthlyCompliance } from "../models/monthlyCompliance.model";
import mongoose from "mongoose";

export const generateMonthlyComplianceRecordsForClient = async (
  clientId: mongoose.Types.ObjectId,
  startMonth: number,
  startYear: number,
) => {
  try {
    const records = [];
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // JS months 0-11
    const currentYear = now.getFullYear();

    let year = startYear;
    let month = startMonth;

    while (
      year < currentYear ||
      (year === currentYear && month <= currentMonth)
    ) {
      records.push({
        client_id: clientId,
        month: month.toString().padStart(2, "0"),
        year,
        category_id: null, // optional
        dataReceiveStatus: "Not Received",
        workProgress: "Not Started",
      });

      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }

    console.log("Generated monthly compliance records:", records);

    if (records.length > 0) {
      try {
        const result = await MonthlyCompliance.insertMany(records, {
          ordered: true,
          rawResult: true,
        });
        console.log("Insert result:", result);
        console.log(`✅ ${records.length} monthly compliance records created`);
      } catch (err) {
        console.error("❌ Failed to create monthly compliance records:", err);
      }
    }

  } catch (err) {
    console.error(
      "❌ Error in generateMonthlyComplianceRecordsForClient:",
      err
    );
  }
};
