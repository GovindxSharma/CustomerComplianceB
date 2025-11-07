import mongoose, { Document, Schema } from "mongoose";

export interface IMonthlyCompliance extends Document {
  client_id: mongoose.Schema.Types.ObjectId;
  month: string;
  year: number;
  category_id: mongoose.Schema.Types.ObjectId; // reference to Category
  dataReceiveStatus:
    | "Data Incomplete"
    | "Data Received"
    | "Not Received"
    | "Inactive"
    | "Data Pending"; // >2 months not received
  workProgress: "Not Started" | "Payment Overdue" | "Completed" | "In Progress";
  workersAsPerData?: number;
  expectedBill?: number;
  actualBill?: number;
  remarks?: string;
  updatedBy?: mongoose.Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const monthlyComplianceSchema = new Schema<IMonthlyCompliance>(
  {
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    month: { type: String, required: true },
    year: { type: Number, required: true },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    dataReceiveStatus: {
      type: String,
      enum: [
        "Data Incomplete",
        "Data Received",
        "Not Received",
        "Inactive",
        "Data Pending",
      ],
      default: "Not Received",
    },
    workProgress: {
      type: String,
      enum: ["Not Started", "Payment Overdue", "Completed", "In Progress"],
      default: "Not Started",
    },
    workersAsPerData: { type: Number, default: 0 },
    expectedBill: { type: Number, default: 0 },
    actualBill: { type: Number, default: 0 },
    remarks: { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const MonthlyCompliance = mongoose.model<IMonthlyCompliance>(
  "MonthlyCompliance",
  monthlyComplianceSchema
);
