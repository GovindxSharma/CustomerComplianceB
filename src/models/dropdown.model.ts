import mongoose, { Document, Schema } from "mongoose";

export interface IDropdown extends Document {
  company_id: mongoose.Schema.Types.ObjectId;
  name: string;
  type: "license" | "password";
}

const dropdownSchema = new Schema<IDropdown>(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["license", "password"],
      required: true,
    },
  },
  { timestamps: true },
);

export const Dropdown = mongoose.model<IDropdown>("Dropdown", dropdownSchema);
