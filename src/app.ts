import "./config"; // loads env first
import express from "express";
import mongoose from "mongoose";
import routes from "./routes";
// import dotenv from "dotenv";
// import "./commons/express.d";

// dotenv.config();
const app = express();
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/", routes);

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
