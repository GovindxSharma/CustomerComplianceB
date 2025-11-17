import { Notification } from "../models/notification.model";
import mongoose from "mongoose";

interface SendNotificationOptions {
  client_id?: mongoose.Types.ObjectId;
  company_id?: mongoose.Types.ObjectId;
  type:
    | "DataReceived"
    | "ProgressUpdated"
    | "BillGenerated"
    | "Overdue"
    | "TicketRaised"
    | "ClientAdded"
    | "Password Added/Updated"
    | "License Added"
  | "License Updated"
  | "Company Updated";
  message: string;
  createdBy: mongoose.Types.ObjectId;
  recipients: mongoose.Types.ObjectId[];
}

export const sendNotification = async (options: SendNotificationOptions) => {
  const { client_id, company_id, type, message, createdBy, recipients } =
    options;

  if (!recipients || recipients.length === 0) return;

  const notificationDocs = recipients.map((user_id) => ({
    client_id,
    company_id,
    type,
    message,
    createdBy,
    recipient_id: user_id,
    isRead: false,
  }));

  return Notification.insertMany(notificationDocs);
};
