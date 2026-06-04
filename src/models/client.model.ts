import mongoose, { Document, Schema } from "mongoose";

export interface IClient extends Document {
  company_id: mongoose.Schema.Types.ObjectId;
  assignedTo?: mongoose.Schema.Types.ObjectId;
  name: string;
  contactPerson?: string;
  contactNumber?: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  status: "Active" | "Inactive" | "Suspended";
  businessUnit?: string;
  site?: string;
  startMonth?: string;
  startYear?: number;
  isOverdue: boolean;
  overdueAmount?: number;
  lastUpdatedBy?: mongoose.Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const clientSchema = new Schema<IClient>(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    gstNumber: { type: String },
    address: { type: String },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended"],
      default: "Active",
    },
    businessUnit: { type: String, required: true },
    site: { type: String, required: true },
    startMonth: { type: String, required: true },
    startYear: { type: Number, required: true },
    isOverdue: { type: Boolean, default: false },
    overdueAmount: { type: Number , default: 0},
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Client = mongoose.model<IClient>("Client", clientSchema);
