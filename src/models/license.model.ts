import mongoose, { Document, Schema } from "mongoose";

export interface ILicense extends Document {
  client_id: mongoose.Schema.Types.ObjectId;
  company_id: mongoose.Schema.Types.ObjectId;
  category: string;
  licenseName: string;
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
    category: { type: String, required: true },
    licenseName: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { timestamps: true }
);

export const License = mongoose.model<ILicense>("License", licenseSchema);
