import mongoose, { Document, Schema } from "mongoose";
import { encryptPassword } from "../utils/passwordService"; // import utility

export interface IPassword extends Document {
  company_id: mongoose.Schema.Types.ObjectId;
  client_id: mongoose.Schema.Types.ObjectId;
  category: string;
  username: string;
  password: string; // encrypted string
  addedBy: mongoose.Schema.Types.ObjectId;
  updatedBy?: mongoose.Schema.Types.ObjectId;
  remarks?: string;
  lastUpdated?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const passwordSchema = new Schema<IPassword>(
  {
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    category: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    remarks: { type: String },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ------------------------------
// Pre-save hook for encryption
// ------------------------------
passwordSchema.pre("save", function (next) {
  if (this.isModified("password")) {
    this.password = encryptPassword(this.password);
    this.lastUpdated = new Date(); // update lastUpdated timestamp automatically
  }
  next();
});

export const Password = mongoose.model<IPassword>("Password", passwordSchema);
