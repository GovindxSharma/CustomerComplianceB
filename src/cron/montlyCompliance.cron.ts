import cron from "node-cron";
import { Client } from "../models/client.model";
import mongoose from "mongoose";
import { generateNextMonthComplianceForClient } from "../controllers/monthlyCompliance.controller";

export const monthlyComplianceCron = () => {
  cron.schedule("5 0 1 * *", async () => {
    console.log("🕛 Monthly Compliance CRON started");

    const clients = await Client.find({ status: "Active" }, { _id: 1 });

    for (const client of clients) {
await generateNextMonthComplianceForClient(
  client._id as mongoose.Types.ObjectId
);    }

    console.log("✅ Monthly Compliance CRON finished");
  });
};
