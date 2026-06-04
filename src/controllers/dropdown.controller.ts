import { Request, Response } from "express";
import { Dropdown } from "../models/dropdown.model";

// CREATE DROPDOWN
export const createDropdown = async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  if (user.role !== "Admin") {
    return res.status(403).json({
      message: "Only admin can manage dropdowns",
    });
  }

  try {
    const { name, type } = req.body;

    const existing = await Dropdown.findOne({
      company_id: user.company_id,
      type,
      name: name.trim(),
    });

    if (existing) {
      return res.status(400).json({
        message: "Dropdown value already exists",
      });
    }

    const dropdown = await Dropdown.create({
      company_id: user.company_id,
      name: name.trim(),
      type,
    });

    return res.status(201).json({
      message: "Dropdown created successfully",
      data: dropdown,
    });
  } catch (error: any) {
    console.error("Create Dropdown Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

// GET ALL DROPDOWNS
export const getDropdowns = async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const { type } = req.query;

    const query: any = {
      company_id: user.company_id,
    };

    if (type) {
      query.type = type;
    }

    const dropdowns = await Dropdown.find(query).sort({
      name: 1,
    });

    return res.status(200).json({
      data: dropdowns,
    });
  } catch (error: any) {
    console.error("Get Dropdowns Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

// GET SINGLE DROPDOWN
export const getDropdownById = async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const dropdown = await Dropdown.findOne({
      _id: req.params.id,
      company_id: user.company_id,
    });

    if (!dropdown) {
      return res.status(404).json({
        message: "Dropdown not found",
      });
    }

    return res.status(200).json({
      data: dropdown,
    });
  } catch (error: any) {
    console.error("Get Dropdown Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

// UPDATE DROPDOWN
export const updateDropdown = async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  if (user.role !== "Admin") {
    return res.status(403).json({
      message: "Only admin can manage dropdowns",
    });
  }

  try {
    const { name } = req.body;

    const dropdown = await Dropdown.findOne({
      _id: req.params.id,
      company_id: user.company_id,
    });

    if (!dropdown) {
      return res.status(404).json({
        message: "Dropdown not found",
      });
    }

    const duplicate = await Dropdown.findOne({
      _id: { $ne: dropdown._id },
      company_id: user.company_id,
      type: dropdown.type,
      name: name.trim(),
    });

    if (duplicate) {
      return res.status(400).json({
        message: "Dropdown value already exists",
      });
    }

    dropdown.name = name.trim();

    await dropdown.save();

    return res.status(200).json({
      message: "Dropdown updated successfully",
      data: dropdown,
    });
  } catch (error: any) {
    console.error("Update Dropdown Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

// DELETE DROPDOWN
export const deleteDropdown = async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  if (user.role !== "Admin") {
    return res.status(403).json({
      message: "Only admin can manage dropdowns",
    });
  }

  try {
    const dropdown = await Dropdown.findOne({
      _id: req.params.id,
      company_id: user.company_id,
    });

    if (!dropdown) {
      return res.status(404).json({
        message: "Dropdown not found",
      });
    }

    await dropdown.deleteOne();

    return res.status(200).json({
      message: "Dropdown deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete Dropdown Error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};
