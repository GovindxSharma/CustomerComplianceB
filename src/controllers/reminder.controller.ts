import { Request, Response } from "express";
import mongoose from "mongoose";
import { Reminder } from "../models/reminder.model";

const toObjectId = (id: any) => {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
};

// ---------------------------------------------
// CREATE REMINDER
// ---------------------------------------------
export const createReminder = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { message, reminderTime } = req.body;

    if (!message || !reminderTime) {
      return res.status(400).json({ message: "Message and reminderTime are required." });
    }

    const userIdObj = toObjectId(user.id);
    const companyIdObj = toObjectId(user.company_id);

    if (!userIdObj || !companyIdObj) {
      return res.status(400).json({ message: "Invalid user or company ID." });
    }

    const reminder = await Reminder.create({
      user_id: userIdObj,
      company_id: companyIdObj,
      message,
      reminderTime: new Date(reminderTime),
    });

    return res.status(201).json({
      message: "Reminder created successfully",
      data: reminder,
    });
  } catch (error: any) {
    console.error("Create Reminder Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------
// GET ALL REMINDERS FOR LOGGED-IN USER
// ---------------------------------------------
export const getReminders = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const userIdObj = toObjectId(user.id);
    if (!userIdObj) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const reminders = await Reminder.find({ user_id: userIdObj })
      .sort({ reminderTime: -1 })
      .lean();

    return res.status(200).json({ data: reminders });
  } catch (error: any) {
    console.error("Get Reminders Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------
// GET ACTIVE REMINDERS (due and not dismissed)
// ---------------------------------------------
export const getActiveReminders = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const userIdObj = toObjectId(user.id);
    if (!userIdObj) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const reminders = await Reminder.find({
      user_id: userIdObj,
      isDismissed: false,
    })
      .sort({ reminderTime: 1 })
      .lean();

    return res.status(200).json({ data: reminders });
  } catch (error: any) {
    console.error("Get Active Reminders Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------
// UPDATE REMINDER
// ---------------------------------------------
export const updateReminder = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const reminderIdObj = toObjectId(id);
    const userIdObj = toObjectId(user.id);

    if (!reminderIdObj || !userIdObj) {
      return res.status(400).json({ message: "Invalid ID format." });
    }

    const { message, reminderTime } = req.body;

    const updated = await Reminder.findOneAndUpdate(
      { _id: reminderIdObj, user_id: userIdObj },
      {
        ...(message && { message }),
        ...(reminderTime && { reminderTime: new Date(reminderTime) }),
        isSnoozed: false,
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Reminder not found." });
    }

    return res.status(200).json({
      message: "Reminder updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Update Reminder Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------
// SNOOZE REMINDER
// ---------------------------------------------
export const snoozeReminder = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { minutes } = req.body;

    if (!minutes || minutes <= 0) {
      return res.status(400).json({ message: "Snooze minutes must be a positive number." });
    }

    const reminderIdObj = toObjectId(id);
    const userIdObj = toObjectId(user.id);

    if (!reminderIdObj || !userIdObj) {
      return res.status(400).json({ message: "Invalid ID format." });
    }

    const newTime = new Date(Date.now() + minutes * 60 * 1000);

    const updated = await Reminder.findOneAndUpdate(
      { _id: reminderIdObj, user_id: userIdObj },
      {
        reminderTime: newTime,
        isSnoozed: true,
        isDismissed: false,
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Reminder not found." });
    }

    return res.status(200).json({
      message: `Reminder snoozed for ${minutes} minutes`,
      data: updated,
    });
  } catch (error: any) {
    console.error("Snooze Reminder Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------
// DISMISS REMINDER
// ---------------------------------------------
export const dismissReminder = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const reminderIdObj = toObjectId(id);
    const userIdObj = toObjectId(user.id);

    if (!reminderIdObj || !userIdObj) {
      return res.status(400).json({ message: "Invalid ID format." });
    }

    const updated = await Reminder.findOneAndUpdate(
      { _id: reminderIdObj, user_id: userIdObj },
      { isDismissed: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Reminder not found." });
    }

    return res.status(200).json({
      message: "Reminder dismissed successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Dismiss Reminder Error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------
// DELETE REMINDER
// ---------------------------------------------
export const deleteReminder = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const reminderIdObj = toObjectId(id);
    const userIdObj = toObjectId(user.id);

    if (!reminderIdObj || !userIdObj) {
      return res.status(400).json({ message: "Invalid ID format." });
    }

    const deleted = await Reminder.findOneAndDelete({
      _id: reminderIdObj,
      user_id: userIdObj,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Reminder not found." });
    }

    return res.status(200).json({ message: "Reminder deleted successfully" });
  } catch (error: any) {
    console.error("Delete Reminder Error:", error);
    return res.status(500).json({ message: error.message });
  }
};
