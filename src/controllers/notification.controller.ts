import { Request, Response } from "express";
import mongoose from "mongoose";
import { Notification } from "../models/notification.model";

const toObjectId = (id: any) => {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
};

// ---------------------------------------------
// CREATE NOTIFICATION
// ---------------------------------------------
export const createNotification = async (req: Request, res: Response) => {
  try {
    const { recipient_id, client_id, company_id, type, message, createdBy } =
      req.body;

    const recipientIdObj = toObjectId(recipient_id);
    const clientIdObj = client_id ? toObjectId(client_id) : undefined;
    const companyIdObj = toObjectId(company_id);
    const createdByObj = toObjectId(createdBy);

    if (!recipientIdObj || !companyIdObj || !createdByObj) {
      return res.status(400).json({ message: "Invalid ObjectId format." });
    }

    const newNotification = await Notification.create({
      recipient_id: recipientIdObj,
      client_id: clientIdObj,
      company_id: companyIdObj,
      type,
      message,
      createdBy: createdByObj,
    });

    return res.status(201).json({
      message: "Notification created successfully",
      data: newNotification,
    });
  } catch (error: any) {
    console.error("Create Notification Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------
// FETCH NOTIFICATIONS FOR A RECIPIENT
// ---------------------------------------------
export const getNotificationsByRecipient = async (
  req: Request,
  res: Response
) => {
  try {
    const { recipient_id } = req.params;

    const recipientIdObj = toObjectId(recipient_id);

    if (!recipientIdObj) {
      return res.status(400).json({ message: "Invalid recipient id." });
    }

    const notifications = await Notification.find({
      recipient_id: recipientIdObj,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ data: notifications });
  } catch (error: any) {
    console.error("Fetch Notification Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------
// MARK A NOTIFICATION AS READ
// ---------------------------------------------
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { notification_id } = req.params;

    const notifObj = toObjectId(notification_id);

    if (!notifObj) {
      return res.status(400).json({ message: "Invalid notification id." });
    }

    const updated = await Notification.findByIdAndUpdate(
      notifObj,
      { isRead: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Notification not found." });
    }

    return res.status(200).json({
      message: "Notification marked as read.",
      data: updated,
    });
  } catch (error: any) {
    console.error("Mark Read Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------
// MARK ALL NOTIFICATIONS AS READ (BONUS 😉)
// ---------------------------------------------
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const { recipient_id } = req.params;

    const recipientIdObj = toObjectId(recipient_id);

    if (!recipientIdObj) {
      return res.status(400).json({ message: "Invalid recipient id." });
    }

    await Notification.updateMany(
      { recipient_id: recipientIdObj, isRead: false },
      { $set: { isRead: true } }
    );

    return res
      .status(200)
      .json({ message: "All notifications marked as read." });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
