import { Request, Response } from "express";
import { License } from "../models/license.model";
import { Client } from "../models/client.model";

// CREATE LICENSE
export const createLicense = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const { client_id, category, licenseName, startDate, endDate } = req.body;

  // Employee check
  if (user.role === "Employee") {
    const client = await Client.findOne({
      _id: client_id,
      company_id: user.company_id,
      assignedTo: user.id,
    });

    if (!client)
      return res
        .status(403)
        .json({ message: "You are not assigned to this client" });
  }

  try {
    const license = await License.create({
      client_id,
      company_id: user.company_id,
      category,
      licenseName,
      startDate,
      endDate,
    });

    return res.status(201).json({ message: "License created", data: license });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET ALL LICENSES (with employee restriction)
export const getLicenses = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    let licenses;
    if (user.role === "Employee") {
      // Only licenses of clients assigned to the employee
      const assignedClients = await Client.find({
        company_id: user.company_id,
        assignedTo: user.id,
      }).select("_id");

      const clientIds = assignedClients.map((c) => c._id);

      licenses = await License.find({
        company_id: user.company_id,
        client_id: { $in: clientIds },
      }).populate("client_id", "name");
    } else {
      // Admin & Accountant: all licenses in company
      licenses = await License.find({ company_id: user.company_id }).populate(
        "client_id",
        "name"
      );
    }

    return res.json({ data: licenses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET SINGLE LICENSE
export const getLicenseById = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    const license = await License.findById(req.params.id).populate(
      "client_id",
      "name"
    );

    if (!license) return res.status(404).json({ message: "License not found" });

    if (
      user.role === "Employee" &&
      !(await Client.findOne({
        _id: license.client_id,
        company_id: user.company_id,
        assignedTo: user.id,
      }))
    ) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this client" });
    }

    return res.json({ data: license });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// UPDATE LICENSE
export const updateLicense = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    const license = await License.findById(req.params.id);
    if (!license) return res.status(404).json({ message: "License not found" });

    // Employee check
    if (
      user.role === "Employee" &&
      !(await Client.findOne({
        _id: license.client_id,
        company_id: user.company_id,
        assignedTo: user.id,
      }))
    ) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this client" });
    }

    const updatedFields = req.body;
    Object.assign(license, updatedFields);
    await license.save();

    return res.json({ message: "License updated", data: license });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE LICENSE
export const deleteLicense = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    const license = await License.findById(req.params.id);
    if (!license) return res.status(404).json({ message: "License not found" });

    if (
      user.role === "Employee" &&
      !(await Client.findOne({
        _id: license.client_id,
        company_id: user.company_id,
        assignedTo: user.id,
      }))
    ) {
      return res
        .status(403)
        .json({ message: "You are not assigned to this client" });
    }

    await license.deleteOne();
    return res.json({ message: "License deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
