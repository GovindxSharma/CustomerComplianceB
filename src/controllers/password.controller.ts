import { Request, Response } from "express";
import mongoose from "mongoose";
import { Password } from "../models/password.model";
import { Client } from "../models/client.model";
import { decryptPassword } from "../utils/passwordService";

const verifyEmployeeAccess = async (
  userId: string,
  companyId: string,
  clientId: string,
) => {
  const client = await Client.findOne({
    _id: clientId,
    company_id: companyId,
    assignedTo: userId,
  });

  return !!client;
};

// =============== CREATE PASSWORD ===================
export const createPassword = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { company_id, client_id, category, username, password, remarks } =
      req.body;

    if (!category) {
      return res.status(400).json({
        message: "Password category is required",
      });
    }

    // Employee can only create for assigned clients
    if (user.role === "Employee") {
      const allowed = await verifyEmployeeAccess(
        user.id,
        user.company_id,
        client_id,
      );
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

    const populatedPassword = await Password.findById(newPassword._id)
      .populate("client_id", "name")
      .populate("category", "name type");

    res.status(201).json({
      message: "Password added",
      data: populatedPassword,
    });
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
      .populate("category", "name type")
      .populate("addedBy", "name")
      .populate("updatedBy", "name")
      .sort({ createdAt: -1 });

    res.json({ data: passwords });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch passwords" });
  }
};

export const getPasswordById = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const password = await Password.findById(req.params.id)
      .populate("client_id", "name")
      .populate("category", "name type")
      .populate("addedBy", "name")
      .populate("updatedBy", "name");

    if (!password) {
      return res.status(404).json({
        message: "Password not found",
      });
    }

    if (
      user.role === "Employee" &&
      !(await verifyEmployeeAccess(
        user.id,
        user.company_id,
        password.client_id.toString(),
      ))
    ) {
      return res.status(403).json({
        message: "Not allowed to view this password",
      });
    }

    return res.json({
      data: password,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Failed to fetch password",
    });
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
        user.company_id,
        existing.client_id.toString(),
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

    const updatedPassword = await Password.findById(existing._id)
      .populate("client_id", "name")
      .populate("category", "name type")
      .populate("addedBy", "name")
      .populate("updatedBy", "name");

    res.json({
      message: "Password updated",
      data: updatedPassword,
    });
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
        user.company_id,
        existing.client_id.toString(),
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
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;

    const record = await Password.findById(id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: "Password record not found",
      });
    }

    if (
      user.role === "Employee" &&
      !(await verifyEmployeeAccess(
        user.id,
        user.company_id,
        record.client_id.toString(),
      ))
    ) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to view this password",
      });
    }

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