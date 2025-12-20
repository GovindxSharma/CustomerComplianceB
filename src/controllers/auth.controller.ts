import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { Client } from "../models/client.model";
import { MonthlyCompliance } from "../models/monthlyCompliance.model";
import { Ticket } from "../models/ticket.model";
import { Password } from "../models/password.model";
import { License } from "../models/license.model";

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

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    // const { _id: userId, role, company_id } = req.user;

    const userId = req.user?.id
    const role = req.user?.role
    const company_id = req.user?.company_id

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let stats: any = {};

    /* =========================
       TOTAL CLIENTS
    ========================== */
    stats.totalClients = await Client.countDocuments({
      company_id,
    });

    /* =========================
       COMPLIANCE TRACKER
    ========================== */
    if (role === "Admin" || role === "Accountant") {
      stats.complianceTracker = await Client.countDocuments({
        company_id,
        status : "Active",
        isOverdue: false,
      });
    } else {
      stats.complianceTracker = await Client.countDocuments({
        company_id,
        assignedTo: userId,
      });
    }

    /* =========================
       EMPLOYEES
    ========================== */
    if (role === "Admin") {
      stats.employees = await User.countDocuments({
        company_id,
        role: { $in: ["Employee", "Accountant"] },
      });
    }

    /* =========================
       OPEN TICKETS
    ========================== */
    if (role === "Admin") {
      stats.openTickets = await Ticket.countDocuments({
        company_id,
        status: "Open",
      });
    } else {
      stats.openTickets = await Ticket.countDocuments({
        company_id,
        status: "Open",
        $or: [{ raisedBy: userId }, { assignedTo: userId }],
      });
    }

    /* =========================
       OVERDUE CLIENTS
    ========================== */
    if (role === "Admin" || role === "Accountant") {
      stats.overdueClients = await Client.countDocuments({
        company_id,
        isOverdue: true,
      });
    } else {
      stats.overdueClients = await Client.countDocuments({
        company_id,
        isOverdue: true,
        assignedTo: userId,
      });
    }

    /* =========================
       PASSWORDS
    ========================== */
    if (role === "Admin" || role === "Accountant") {
      stats.passwords = await Password.countDocuments({
        company_id,
      });
    } else {
      const assignedClientIds = await Client.find(
        { company_id, assignedTo: userId },
        { _id: 1 }
      );

      stats.passwords = await Password.countDocuments({
        company_id,
        client_id: { $in: assignedClientIds },
      });
    }

    /* =========================
       LICENSE TRACKER
    ========================== */
    if (role === "Admin" || role === "Accountant") {
      stats.licenses = await License.countDocuments({
        company_id,
      });
    } else {
      const assignedClientIds = await Client.find(
        { company_id, assignedTo: userId },
        { _id: 1 }
      );

      stats.licenses = await License.countDocuments({
        company_id,
        client_id: { $in: assignedClientIds },
      });
    }

    /* =========================
       BILL PENDING
    ========================== */
    if (role === "Accountant") {
      stats.billPending = await MonthlyCompliance.countDocuments({
        company_id,
        workProgress: "Completed",
        billStatus: "Pending",
      });
    }

    /* =========================
       DATA RECEIVED (EMPLOYEE)
    ========================== */
    if (role === "Employee") {
      stats.dataReceived = await MonthlyCompliance.countDocuments({
        company_id,
        assignedTo: userId,
        dataReceiveStatus: "Data Received",
        workProgress: { $ne: "Completed" },
        month: currentMonth,
        year: currentYear,
      });

      stats.dataComplete = await MonthlyCompliance.countDocuments({
        company_id,
        assignedTo: userId,
        workProgress: "Completed",
        month: currentMonth,
        year: currentYear,
      });
    }

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard stats",
    });
  }
};
