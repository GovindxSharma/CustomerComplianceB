import { Request, Response } from "express";
import { User } from "../models/user.model";
import { Roles } from "../commons/roles";
import { sendEmail } from "../utils/emailService";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

// Create User
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, company_id } = req.body;

    // Check if email already exists (if provided)
    if (email) {
      const existing = await User.findOne({ email });
      if (existing)
        return res.status(400).json({ message: "Email already exists" });
    }

    // Create new user (pre-save will hash password and default user_id)
    const user = new User({ name, email, password, role, company_id });
    await user.save();

    res.status(201).json({ message: "User created", user });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// Get all users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get single user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { name, email, role, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (email && user.email !== email) {
      const existing = await User.findOne({ email });
      if (existing)
        return res.status(400).json({ message: "Email already exists" });
    }

    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.role = role ?? user.role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();
    res.json({ message: "User updated", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Login User
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role, company_id: user.company_id },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getEmployeesByCompany = async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.company_id;

    if (!companyId) {
      return res
        .status(400)
        .json({ message: "Company ID not found in request" });
    }

    // Find users with role 'EMPLOYEE' in the same company
    const employees = await User.find({
      company_id: companyId,
      role: Roles.EMPLOYEE,
      isActive: true,
    }).select("_id name email role"); // optional: select only needed fields

    res.status(200).json({ employees });
  } catch (err) {
    console.error("❌ Error fetching employees:", err);
    res.status(500).json({ message: "Server error" });
  }
};
