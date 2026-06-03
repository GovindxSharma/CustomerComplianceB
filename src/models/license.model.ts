import mongoose, { Document, Schema } from "mongoose";

export interface ILicense extends Document {
  client_id: mongoose.Schema.Types.ObjectId;
  company_id: mongoose.Schema.Types.ObjectId;
  category: mongoose.Schema.Types.ObjectId;
  licenseName: string;
  workerLimit: number;
  startDate: Date;
  endDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const licenseSchema = new Schema<ILicense>(
  {
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dropdown",
      required: true,
    },
    licenseName: {
      type: String,
      required: true,
      trim: true,
    },
    workerLimit: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

export const License = mongoose.model<ILicense>("License", licenseSchema);
