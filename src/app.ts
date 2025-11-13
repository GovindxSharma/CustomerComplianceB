import "./config"; 
import express from "express";
import mongoose from "mongoose";
import routes from "./routes";
import cors from "cors";

const app = express();

// CORS setup with env-based origin
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN?.split(",") || "*", // supports multiple origins if comma-separated
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/", routes);

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
