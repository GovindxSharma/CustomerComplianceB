import { Request, Response } from "express";
import mongoose from "mongoose";
import { Password } from "../models/password.model";
import { Client } from "../models/client.model";
import { decryptPassword } from "../utils/passwordService";

// Utility: check if employee can access a given client
const verifyEmployeeAccess = async (userId: string, clientId: string) => {
  const client = await Client.findOne({
    _id: clientId,
    assignedTo: userId,
  });
  return !!client; // true if assigned
};

// =============== CREATE PASSWORD ===================
export const createPassword = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { company_id, client_id, category, username, password, remarks } =
      req.body;

    // Employee can only create for assigned clients
    if (user.role === "Employee") {
      const allowed = await verifyEmployeeAccess(user.id, client_id);
      if (!allowed) {
        return res
          .status(403)
          .json({ message: "Not allowed to create password for this client" });
      }
    }

    const newPassword = await Password.create({
      company_id,
      client_id,
      category,
      username,
      password,
      remarks,
      addedBy: user.id,
    });

    res.status(201).json({ message: "Password added", data: newPassword });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: err.message || "Failed to create entry" });
  }
};

// =============== GET ALL PASSWORDS ===================
export const getAllPasswords = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { company_id } = req.query;

    let query: any = { company_id };

    // Employee → restrict to assigned clients only
    if (user.role === "Employee") {
      const assignedClients = await Client.find({
        assignedTo: user.id,
      }).select("_id");
      const allowedIds = assignedClients.map((c) => c._id);
      query.client_id = { $in: allowedIds };
    }

    const passwords = await Password.find(query)
      .populate("client_id", "name")
      .populate("addedBy", "name")
      .populate("updatedBy", "name")
      .sort({ createdAt: -1 });

    res.json({ data: passwords });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch passwords" });
  }
};

// =============== UPDATE PASSWORD ===================
export const updatePassword = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const passwordId = req.params.id;

    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const existing = await Password.findById(passwordId);
    if (!existing) {
      return res.status(404).json({ message: "Password not found" });
    }

    // Employee cannot update if not assigned
    if (user.role === "Employee") {
      const allowed = await verifyEmployeeAccess(
        user.id,
        existing.client_id.toString()
      );
      if (!allowed) {
        return res
          .status(403)
          .json({ message: "Not allowed to update this password" });
      }
    }

    const { category, username, password, remarks } = req.body;

    existing.category = category ?? existing.category;
    existing.username = username ?? existing.username;
    if (password) existing.password = password; // triggers encryption
    existing.remarks = remarks ?? existing.remarks;
    existing.updatedBy = new mongoose.Types.ObjectId(user.id);

    await existing.save();

    res.json({ message: "Password updated", data: existing });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Failed to update password" });
  }
};

// =============== DELETE PASSWORD ===================
export const deletePassword = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const passwordId = req.params.id;

    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const existing = await Password.findById(passwordId);
    if (!existing) {
      return res.status(404).json({ message: "Password not found" });
    }

    // Employee → check assigned
    if (user.role === "Employee") {
      const allowed = await verifyEmployeeAccess(
        user.id,
        existing.client_id.toString()
      );
      if (!allowed) {
        return res
          .status(403)
          .json({ message: "Not allowed to delete this password" });
      }
    }

    await existing.deleteOne();

    res.json({ message: "Password deleted" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete password" });
  }
};

export const decryptPasswords = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const record = await Password.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Password record not found",
      });
    }

    // decrypting the password
    const decrypted = decryptPassword(record.password);

    return res.status(200).json({
      success: true,
      decrypted,
    });
  } catch (error) {
    console.error("Decrypt error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to decrypt password",
    });
  }
};