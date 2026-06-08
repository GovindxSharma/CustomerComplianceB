import { Request, Response } from "express";
import mongoose from "mongoose";
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
    const JWT_EXPIRES_IN = "12h";

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
      { expiresIn: JWT_EXPIRES_IN },
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

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const currentYear = now.getFullYear();

    let stats: any = {};

    /* =========================
       RESOLVE CLIENT IDS FIRST
    ========================== */
    let clientIds: any[] = [];

    if (role === "Admin" || role === "Accountant") {
      clientIds = await Client.find({ company_id }, { _id: 1 }).lean();
    } else if (role === "Employee") {
      clientIds = await Client.find({ assignedTo: userId }, { _id: 1 }).lean();
    }

    const clientIdList = clientIds.map(
      (c) => new mongoose.Types.ObjectId(c._id.toString()),
    );

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
        // isOverdue: false,
      });
    } else {
      stats.complianceTracker = await Client.countDocuments({
        _id: { $in: clientIdList },
        status: "Active",
        // isOverdue: false,
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
        $or: [{ raisedBy: userId }, { assignedTo: userId }],
        status: "Open",
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
   BILL PENDING (ADMIN + ACCOUNTANT)
========================== */
    if (role === "Admin" || role === "Accountant") {
      stats.billPending = await MonthlyCompliance.countDocuments({
        client_id: { $in: clientIdList },
        workProgress: "Completed",
        billStatus: { $ne: "Generated" },
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
        workProgress: "Not Started",
        dataReceiveStatus: "Data Received",
      });

      stats.dataComplete = await MonthlyCompliance.countDocuments({
        client_id: { $in: clientIdList },
        workProgress: "Completed",
        dataReceiveStatus: "Data Received",
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

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: "Company ID missing",
      });
    }

    const year =
      parseInt(req.query.year as string, 10) || new Date().getFullYear();

    const clients = await Client.find({ company_id });

    // Index 1-12 will be used for months
    const monthStats = Array.from({ length: 13 }, () => ({
      new: 0,
      inactive: 0,
    }));

    clients.forEach((client) => {
      if (!client.createdAt) return;

      const createdAt = new Date(client.createdAt);

      if (createdAt.getFullYear() !== year) return;

      const month = createdAt.getMonth() + 1; // 1-12

      if (client.status === "Active") {
        monthStats[month]!.new += 1;
      } else if (client.status === "Inactive") {
        monthStats[month]!.inactive += 1;
      }
    });

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const result = monthNames.map((monthName, index) => ({
      month: monthName,
      new: monthStats[index + 1]?.new ?? 0,
      inactive: monthStats[index + 1]?.inactive ?? 0,
    }));

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Client monthly stats error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to load client stats",
    });
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

    const currentYear = new Date().getFullYear();
    const yearParam = Number(req.query.year);

    const year = !isNaN(yearParam) ? yearParam : currentYear;

    // Step 1: Get clients of company
    const clients = await Client.find({ company_id }, { _id: 1 }).lean();
    const clientIds = clients.map((c) => c._id);

    // Step 2: Fetch records for that year
    const records = await MonthlyCompliance.find({
      client_id: { $in: clientIds },
      year: year,
    }).lean();

    // Step 3: Prepare month order
    const months = [
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
    ];

    const revenueMap: Record<string, number> = {};

    months.forEach((m) => {
      revenueMap[m] = 0;
    });

    // Step 4: Aggregate revenue
    records.forEach((rec) => {
      const month = rec.month;

      if (month && revenueMap[month] !== undefined) {
        revenueMap[month] += rec.actualBill || 0;
      }
    });

    // Step 5: Ensure ascending order
    const result = months.map((month) => ({
      month,
      revenue: revenueMap[month],
    }));

    return res.status(200).json({
      success: true,
      year,
      data: result,
    });
  } catch (err) {
    console.error("Revenue monthly stats error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load revenue stats" });
  }
};
