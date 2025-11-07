import { Request, Response } from "express";
import { Company } from "../models/company.model";

export const createCompany = async (req: Request, res: Response) => {
  try {
    const { name, email, location, phone, isActive } = req.body;

    const existing = await Company.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Company already exists" });

    const company = await Company.create({
      name,
      email,
      location,
      phone,
      isActive: isActive ?? true,
    });

    return res.status(201).json({ message: "Company created", company });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await Company.find();
    res.json({ companies });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getCompanyById = async (req: Request, res: Response) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.json({ company });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateCompany = async (req: Request, res: Response) => {
  try {
    const { name, email, location, phone, isActive } = req.body;
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { name, email, location, phone, isActive },
      { new: true }
    );
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.json({ message: "Company updated", company });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteCompany = async (req: Request, res: Response) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ message: "Company not found" });
    res.json({ message: "Company deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
