import "./config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import routes from "./routes";
import "./models/category.model";
import { monthlyComplianceCron } from "./cron/montlyCompliance.cron";
import { generateCurrentMonthComplianceForAllClients } from "./helpers/monthlyCompliance.helper";

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN?.split(",") || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/", routes);

/**
 * Admin-only manual trigger — useful for:
 *  - Backfilling records if the server was down on the 1st
 *  - Testing without waiting for the cron to fire
 *
 * POST /admin/trigger-monthly-compliance
 * Protected by whatever auth middleware you have on admin routes.
 */
app.post("/admin/trigger-monthly-compliance", async (req, res) => {
  try {
    const { month, year } = { ...req.query, ...req.body };
    let summary;

    if (month && year) {
      const overrideMonth = parseInt(month as string, 10);
      const overrideYear = parseInt(year as string, 10);
      summary = await generateCurrentMonthComplianceForAllClients(undefined, overrideMonth, overrideYear);
    } else {
      summary = await generateCurrentMonthComplianceForAllClients();
    }

    res.json({ ok: true, summary });
  } catch (err) {
    console.error("[Manual Trigger] ❌", err);
    res
      .status(500)
      .json({ ok: false, error: "Failed to run compliance generation" });
  }
});

// ── MongoDB + startup ─────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => {
    console.log("✅ MongoDB connected");
    monthlyComplianceCron(); // register the cron AFTER DB is ready
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // no point running without a DB
  });

// ── Server ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
