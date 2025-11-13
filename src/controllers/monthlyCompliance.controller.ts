// src/controllers/monthlyCompliance.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { MonthlyCompliance } from "../models/monthlyCompliance.model";
import { Roles } from "../commons/roles";

// Helper to generate monthly records for a client
export const generateMonthlyComplianceForClient = async (
  clientId: string,
  startMonth: number,
  startYear: number,
  categories: mongoose.Types.ObjectId[]
) => {
  const current = new Date();
  const records: any[] = [];

  let year = startYear;
  let month = startMonth;

  while (
    year < current.getFullYear() ||
    (year === current.getFullYear() && month <= current.getMonth() + 1)
  ) {
    for (const categoryId of categories) {
      records.push({
        client_id: clientId,
        month: month.toString().padStart(2, "0"),
        year,
        category_id: categoryId,
      });
    }

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  if (records.length > 0) {
    await MonthlyCompliance.insertMany(records);
  }
};

// Create / add a new monthly compliance manually (Admin only)
export const createMonthlyCompliance = async (req: Request, res: Response) => {
  try {
    const { client_id, month, year, category_id } = req.body;
    if (!client_id || !month || !year || !category_id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const record = await MonthlyCompliance.create({
      client_id,
      month,
      year,
      category_id,
    });
    res.status(201).json({ message: "Monthly compliance created", record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all records for a client
export const getMonthlyComplianceByClient = async (
  req: Request,
  res: Response
) => {
  try {
    const { clientId } = req.params;
    const records = await MonthlyCompliance.find({
      client_id: clientId,
    }).populate("category_id", "name");
    res.status(200).json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get a single record by ID
export const getMonthlyComplianceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = await MonthlyCompliance.findById(id).populate(
      "category_id",
      "name"
    );
    if (!record) return res.status(404).json({ message: "Record not found" });
    res.status(200).json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update record with role-based restrictions
export const updateMonthlyCompliance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      dataReceiveStatus,
      workProgress,
      expectedBill,
      actualBill,
      remarks,
    } = req.body;

    const record = await MonthlyCompliance.findById(id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
}
    // Role-based updates
    const role = req.user.role;

    if (role === Roles.EMPLOYEE) {
      if (dataReceiveStatus) record.dataReceiveStatus = dataReceiveStatus;
      if (workProgress) record.workProgress = workProgress;
    } else if (role === Roles.ACCOUNTANT) {
      if (expectedBill !== undefined) record.expectedBill = expectedBill;
      if (actualBill !== undefined) record.actualBill = actualBill;
    } else if (role === Roles.ADMIN) {
      if (dataReceiveStatus) record.dataReceiveStatus = dataReceiveStatus;
      if (workProgress) record.workProgress = workProgress;
      if (expectedBill !== undefined) record.expectedBill = expectedBill;
      if (actualBill !== undefined) record.actualBill = actualBill;
      if (remarks) record.remarks = remarks;
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

record.updatedBy = new mongoose.Types.ObjectId(
  req.user.id
) as unknown as mongoose.Schema.Types.ObjectId;

    await record.save();

    res.status(200).json({ message: "Record updated", record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete record (Admin only)
export const deleteMonthlyCompliance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await MonthlyCompliance.findByIdAndDelete(id);
    res.status(200).json({ message: "Record deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Cron-ready: generate next month records for all clients
export const generateNextMonthComplianceForAllClients = async (
  categories: mongoose.Types.ObjectId[],
  getClients: () => Promise<any[]>
) => {
  const clients = await getClients();

  const today = new Date();
  const nextMonth = today.getMonth() + 2; // JS months: 0-11
  const year = nextMonth > 12 ? today.getFullYear() + 1 : today.getFullYear();
  const month = nextMonth > 12 ? 1 : nextMonth;

  for (const client of clients) {
    await generateMonthlyComplianceForClient(
      client._id,
      month,
      year,
      categories
    );
  }
};
