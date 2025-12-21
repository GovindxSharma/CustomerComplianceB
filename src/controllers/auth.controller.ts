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
    const userId = req.user?.id;
    const role = req.user?.role;
    const company_id = req.user?.company_id;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let stats: any = {};

    /* =========================
       RESOLVE CLIENT IDS FIRST
    ========================== */
    let clientIds: any[] = [];

    if (role === "Admin" || role === "Accountant") {
      clientIds = await Client.find({ company_id }, { _id: 1 }).lean();
    } else if (role === "Employee") {
      clientIds = await Client.find(
        { company_id, assignedTo: userId },
        { _id: 1 }
      ).lean();
    }

    const clientIdList = clientIds.map((c) => c._id);

    /* =========================
       TOTAL CLIENTS
    ========================== */
    stats.totalClients =
      role === "Admin" || role === "Accountant"
        ? clientIdList.length
        : clientIdList.length;

    /* =========================
       COMPLIANCE TRACKER
    ========================== */
    if (role === "Admin" || role === "Accountant") {
      stats.complianceTracker = await Client.countDocuments({
        company_id,
        status: "Active",
        isOverdue: false,
      });
    } else {
      stats.complianceTracker = await Client.countDocuments({
        _id: { $in: clientIdList },
        status: "Active",
        isOverdue: false,
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
        _id: { $in: clientIdList },
        isOverdue: true,
      });
    }

    /* =========================
       PASSWORDS
    ========================== */
    if (role === "Admin" || role === "Accountant") {
      stats.passwords = await Password.countDocuments({ company_id });
    } else {
      stats.passwords = await Password.countDocuments({
        client_id: { $in: clientIdList },
      });
    }

    /* =========================
       LICENSE TRACKER
    ========================== */
    if (role === "Admin" || role === "Accountant") {
      stats.licenses = await License.countDocuments({ company_id });
    } else {
      stats.licenses = await License.countDocuments({
        client_id: { $in: clientIdList },
      });
    }

    /* =========================
       BILL PENDING (ACCOUNTANT)
    ========================== */
    if (role === "Accountant") {
      stats.billPending = await MonthlyCompliance.countDocuments({
        client_id: { $in: clientIdList },
        workProgress: "Completed",
        billStatus: "Pending",
        // month: currentMonth,
        // year: currentYear,
      });
    }

    /* =========================
       DATA RECEIVED / COMPLETE (EMPLOYEE)
    ========================== */
    if (role === "Employee") {
      stats.dataReceived = await MonthlyCompliance.countDocuments({
        client_id: { $in: clientIdList },
        dataReceiveStatus: "Data Received",
        workProgress: { $ne: "Completed" },
        month: currentMonth,
        year: currentYear,
      });

      stats.dataComplete = await MonthlyCompliance.countDocuments({
        client_id: { $in: clientIdList },
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
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard stats",
    });
  }
};

// ======================
// CLIENT MONTHLY STATS (Active / Inactive)
// GET /api/auth/client-monthly-stats
// ======================
export const getClientMonthlyStats = async (req: Request, res: Response) => {
  try {
    const company_id = req.user?.company_id;
    if (!company_id)
      return res.status(400).json({ message: "Company ID missing" });

    const clients = await Client.find({ company_id });

    const stats: Record<string, { new: number; inactive: number }> = {};

    clients.forEach((client) => {
      const month = client.startMonth || "Unknown";
      if (!stats[month]) stats[month] = { new: 0, inactive: 0 };

      if (client.status === "Active") stats[month].new += 1;
      else if (client.status === "Inactive") stats[month].inactive += 1;
    });

    // ✅ TS-safe mapping
    const result = Object.keys(stats).map((month) => ({
      month,
      new: stats[month]?.new || 0,
      inactive: stats[month]?.inactive || 0,
    }));

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Client monthly stats error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load client stats" });
  }
};


// ======================
// REVENUE PER MONTH
// GET /api/auth/revenue-monthly
// ======================
export const getRevenueMonthly = async (req: Request, res: Response) => {
  try {
    const company_id = req.user?.company_id;
    if (!company_id)
      return res.status(400).json({ message: "Company ID missing" });

    // Step 1: Get all clients for this company
    const clients = await Client.find({ company_id }, { _id: 1 }).lean();
    const clientIds = clients.map((c) => c._id);

    // Step 2: Get monthly compliance records for these clients
    const records = await MonthlyCompliance.find({
      client_id: { $in: clientIds },
    }).lean();

    // Step 3: Aggregate revenue by month
    const revenueMap: Record<string, number> = {};
    records.forEach((rec) => {
      const month = rec.month || "Unknown";
      if (!revenueMap[month]) revenueMap[month] = 0;
      revenueMap[month] += rec.actualBill || 0;
    });

    // Step 4: Convert to array for frontend
    const result = Object.keys(revenueMap).map((month) => ({
      month,
      revenue: revenueMap[month],
    }));

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Revenue monthly stats error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load revenue stats" });
  }
};

