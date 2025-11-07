import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";

// Login
export const login = async (req: Request, res: Response) => {
    try {
      const JWT_SECRET = process.env.JWT_SECRET!;
        const JWT_EXPIRES_IN = "1h";
        
    const { identifier, password } = req.body; // identifier can be email or user_id

    if (!identifier || !password)
      return res
        .status(400)
        .json({ message: "Identifier and password required" });

    // Find by email OR user_id
    const user = await User.findOne({
      $or: [{ email: identifier }, { user_id: identifier }],
    });

    if (!user || !user.isActive)
      return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, company_id: user.company_id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({ message: "Login successful", token, user });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// Logout
export const logout = async (req: Request, res: Response) => {
  // With JWT, logout is usually handled on client side by deleting the token
  // Optionally, you can implement a token blacklist if needed
  res.status(200).json({ message: "Logout successful" });
};
