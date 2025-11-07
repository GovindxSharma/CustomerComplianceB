// src/controllers/client.controller.ts
import { Request, Response } from "express";
import { Client } from "../models/client.model";
import { sendEmail } from "../utils/emailService"; // our central email utility

// Create client
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
      sendWelcomeEmail = false, // optional boolean to send welcome email
      company_id,
    } = req.body;

    if (!name || !contactPerson || !contactNumber || !company_id) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // Check if client already exists by name + company
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
    });

      console.log(sendWelcomeEmail, email)
    // Send welcome email if requested and email exists
    if (sendWelcomeEmail && email) {
      await sendEmail({
        to: email,
        subject: "Welcome to CCS",
        text: `Hello ${contactPerson}, your company ${name} has been registered!`,
        html: `<p>Hello <strong>${contactPerson}</strong>, your company <strong>${name}</strong> has been registered!</p>`,
      });
      console.log(`Welcome email sent to ${email}`);
      }
      
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
