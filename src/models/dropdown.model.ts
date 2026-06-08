import mongoose, { Document, Schema } from "mongoose";

export interface IDropdown extends Document {
  company_id: mongoose.Schema.Types.ObjectId;
  name: string;
  type: "license" | "password" | "companyName" | "businessUnit";
  parent_id?: mongoose.Schema.Types.ObjectId;
}

const dropdownSchema = new Schema<IDropdown>(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    name: { type: String, nullable: true },
    type: {
      type: String,
      enum: ["license", "password", "companyName", "businessUnit"],
      required: true,
    },
    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dropdown",
      required: false,
    },
  },
  { timestamps: true },
);

export const Dropdown = mongoose.model<IDropdown>("Dropdown", dropdownSchema);
