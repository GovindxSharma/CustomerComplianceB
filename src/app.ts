import "./config";
import express from "express";
import mongoose from "mongoose";
import routes from "./routes";
import cors from "cors";
import "./models/category.model";
import { monthlyComplianceCron } from "./cron/montlyCompliance.cron";
// import { generateMonthlyComplianceRecordsForClient } from "./helpers/monthlyCompliance.helper";
// import { Client } from "./models/client.model";

const app = express();

// CORS setup
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN?.split(",") || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// export const runMonthlyComplianceForAllClients = async () => {
//   try {
//     const clients = await Client.find({
//       startMonth: { $exists: true, $ne: null },
//       startYear: { $exists: true, $ne: null },
//     });

//     console.log(`🚀 Running compliance for ${clients.length} clients...`);

//     for (const client of clients) {
//       await generateMonthlyComplianceRecordsForClient(
//         client.id,
//         parseInt(client.startMonth!), // since it's string
//         client.startYear!,
//       );
//     }

//     console.log("✅ All clients processed successfully");
//   } catch (error) {
//     console.error("❌ Error running compliance for all clients:", error);
//   }
// };

app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => {
    monthlyComplianceCron();
    // runMonthlyComplianceForAllClients();
    console.log("✅ MongoDB connected");
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/", routes);

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
