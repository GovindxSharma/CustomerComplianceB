import { Request, Response } from "express";
import { Client } from "../models/client.model";
import { generateMonthlyComplianceRecordsForClient } from "../helpers/monthlyCompliance.helper";
import mongoose from "mongoose";

export const createClient = async (req: Request, res: Response) => {
  try {
    const {
      name,
      contactPerson,
      contactNumber,
      email,
      gstNumber,
      address,
      businessUnit,
      site,
      company_id,
      startMonth,
      startYear,
      assignedTo, 
    } = req.body;

    if (!name || !contactPerson || !contactNumber || !company_id) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const existing = await Client.findOne({ email, company_id });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Client already exists for this company" });
    }

    const client = await Client.create({
      name,
      contactPerson,
      contactNumber,
      email,
      gstNumber,
      address,
      businessUnit,
      site,
      company_id,
      ...(assignedTo && { assignedTo }), 
    });

    // parse startMonth and startYear to numbers
    const startMonthNum = Number(startMonth);
    const startYearNum = Number(startYear);

    await generateMonthlyComplianceRecordsForClient(
      client._id as mongoose.Types.ObjectId,
      startMonthNum,
      startYearNum,
    );

    res.status(201).json({ message: "Client created successfully", client });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all clients for a company
export const getClients = async (req: Request, res: Response) => {
  try {
    const { company_id } = req.query;
    if (!company_id)
      return res.status(400).json({ message: "company_id is required" });

    const clients = await Client.find({ company_id });
    res.status(200).json({ clients });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get client by ID
export const getClientById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    res.status(200).json({ client });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update client
export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const client = await Client.findByIdAndUpdate(id, updates, { new: true });
    if (!client) return res.status(404).json({ message: "Client not found" });

    res.status(200).json({ message: "Client updated", client });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete client
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await Client.findByIdAndDelete(id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    res.status(200).json({ message: "Client deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
