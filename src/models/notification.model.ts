import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  recipient_id: mongoose.Schema.Types.ObjectId; // the user who receives this notification
  client_id?: mongoose.Schema.Types.ObjectId;
  company_id: mongoose.Schema.Types.ObjectId;
  type:
    | "DataReceived"
    | "ProgressUpdated"
    | "BillGenerated"
    | "Overdue"
    | "TicketRaised"
    | "ClientAdded"
    | "Password Added/Updated"
    | "License Added"
    | "License Updated";
  message: string;
  createdBy: mongoose.Schema.Types.ObjectId;
  isRead: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    company_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "DataReceived",
        "ProgressUpdated",
        "BillGenerated",
        "Overdue",
        "TicketRaised",
        "ClientAdded",
        "Password Added/Updated",
        "License Added",
        "License Updated",
      ],
      required: true,
    },
    message: { type: String, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);
