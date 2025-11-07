import { Notification } from "../models/notification.model";
import mongoose from "mongoose";

interface SendNotificationOptions {
  client_id?: mongoose.Schema.Types.ObjectId;
  company_id?: mongoose.Schema.Types.ObjectId;
  type: "DataReceived" | "ProgressUpdated" | "BillGenerated" | "Overdue" | "TicketRaised" | "ClientAdded" | "PasswordAddedOrUpdated";
  message: string;
  createdBy: mongoose.Schema.Types.ObjectId;
  recipients: mongoose.Schema.Types.ObjectId[]; // user IDs who will receive
}

export const sendNotification = async (options: SendNotificationOptions) => {
  const { client_id, company_id, type, message, createdBy, recipients } = options;

  if (!recipients || recipients.length === 0) return;

  const notificationDocs = recipients.map((user_id) => ({
    client_id,
    company_id,
    type,
    message,
    createdBy,
    recipient: user_id, // each user gets their own notification
    isRead: false,
  }));

  return Notification.insertMany(notificationDocs);
};
