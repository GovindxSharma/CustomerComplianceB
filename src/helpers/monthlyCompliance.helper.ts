import { MonthlyCompliance } from "../models/monthlyCompliance.model";
import mongoose from "mongoose";

export const generateMonthlyComplianceRecordsForClient = async (
  clientId: mongoose.Types.ObjectId,
  startMonth: number, 
  startYear: number,
  companyId: mongoose.Types.ObjectId,
  createdById: mongoose.Types.ObjectId
) => {
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
      category_id: null, // optional: you can set default category if needed
      dataReceiveStatus: "Not Received",
      workProgress: "Not Started",
      updatedBy: createdById,
    });

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  if (records.length > 0) {
    await MonthlyCompliance.insertMany(records);
  }
};
