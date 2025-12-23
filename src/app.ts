import "./config";
import express from "express";
import mongoose from "mongoose";
import routes from "./routes";
import cors from "cors";
import "./models/category.model";
import { monthlyComplianceCron } from "./cron/montlyCompliance.cron";

const app = express();

// CORS setup
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN?.split(",") || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => {
    monthlyComplianceCron();
    console.log("✅ MongoDB connected");
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/", routes);

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
