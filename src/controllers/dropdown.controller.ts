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
    const { name, type, parent_id } = req.body;

    const trimmedName = typeof name === "string" ? name.trim() : null;

    const query: any = {
      company_id: user.company_id,
      type,
    };

    if (trimmedName) {
      query.name = trimmedName;
    }

    if (parent_id) {
      query.parent_id = parent_id;
    }

    if (trimmedName) {
      const existing = await Dropdown.findOne(query);

      if (existing) {
        const messages: Record<string, string> = {
          companyName: "Company name already exists",
          businessUnit: "Business unit already exists",
          license: "License already exists",
          password: "Password category already exists",
        };

        return res.status(400).json({
          message: messages[type],
        });
      }
    }

    const dropdown = await Dropdown.create({
      company_id: user.company_id,
      name: trimmedName,
      type,
      parent_id: parent_id || undefined,
    });

    return res.status(201).json({
      message: `${type} created successfully`,
      data: dropdown,
    });
  } catch (error: any) {
    console.error("Create Dropdown Error:", error);

    // Mongo unique index error
    if (error.code === 11000) {
      return res.status(400).json({
        message: "This value already exists",
      });
    }

    return res.status(500).json({
      message: error.message || "Failed to create dropdown",
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
    const { type, parent_id } = req.query;

    const query: any = {
      company_id: user.company_id,
    };

    if (type) {
      query.type = type;
    }

    if (parent_id) {
      query.parent_id = parent_id;
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
    const { name, parent_id } = req.body;

    const dropdown = await Dropdown.findOne({
      _id: req.params.id,
      company_id: user.company_id,
    });

    if (!dropdown) {
      return res.status(404).json({
        message: "Dropdown not found",
      });
    }

    const query: any = {
      _id: { $ne: dropdown._id },
      company_id: user.company_id,
      type: dropdown.type,
      name: name.trim(),
    };

    if (parent_id || dropdown.parent_id) {
      query.parent_id = parent_id || dropdown.parent_id;
    }

    const duplicate = await Dropdown.findOne(query);

if (duplicate) {
  const messages: Record<string, string> = {
    companyName: "Company name already exists",
    businessUnit: "Business unit already exists",
    license: "License already exists",
    password: "Password category already exists",
  };

  return res.status(400).json({
    message: messages[dropdown.type] || "Dropdown value already exists",
  });
}
    dropdown.name = name.trim();
    if (parent_id !== undefined) {
      dropdown.parent_id = parent_id;
    }

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
