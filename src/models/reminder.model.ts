import mongoose, { Document, Schema } from "mongoose";

export interface IReminder extends Document {
  user_id: mongoose.Schema.Types.ObjectId;
  company_id: mongoose.Schema.Types.ObjectId;
  message: string;
  reminderTime: Date;
  isSnoozed: boolean;
  isDismissed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const reminderSchema = new Schema<IReminder>(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    message: { type: String, required: true, trim: true },
    reminderTime: { type: Date, required: true },
    isSnoozed: { type: Boolean, default: false },
    isDismissed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Reminder = mongoose.model<IReminder>("Reminder", reminderSchema);
