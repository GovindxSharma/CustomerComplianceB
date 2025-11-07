import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db";

dotenv.config();
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => res.send("🚀 CCS Backend Running!"));

// Database & Server
const PORT = process.env.PORT || 5000;
connectDB();
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
