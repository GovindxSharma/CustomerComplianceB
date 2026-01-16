import { Request, Response } from "express";
import { Client } from "../models/client.model";
import { generateMonthlyComplianceRecordsForClient } from "../helpers/monthlyCompliance.helper";
import mongoose from "mongoose";
import { MonthlyCompliance } from "../models/monthlyCompliance.model";
import {User} from "../models/user.model"; // make sure this is your user model
import { sendNotification } from "../utils/notificationService";
import { Roles } from "../commons/roles";

const toObjectId = (value: any): mongoose.Types.ObjectId =>
  new mongoose.Types.ObjectId(String(value));

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
      company_id,
      startMonth,
      startYear,
      assignedTo,
    } = req.body;

    if (!name || !contactPerson || !contactNumber || !company_id) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const existing = await Client.findOne({ name, company_id });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Client already exists for this company" });
    }

    // parse startMonth and startYear to numbers
    const startMonthNum = Number(startMonth);
    const startYearNum = Number(startYear);

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
      ...(assignedTo && { assignedTo }),
      startMonth: startMonthNum.toString(), // save as string like in schema
      startYear: startYearNum,
    });

    await generateMonthlyComplianceRecordsForClient(
      client._id as mongoose.Types.ObjectId,
      startMonthNum,
      startYearNum
    );

    const admins = await User.find({
      company_id,
      role: Roles.ADMIN,
    });

    const accountants = await User.find({
      company_id,
      role: Roles.ACCOUNTANT,
    });

    const recipients: mongoose.Types.ObjectId[] = [
      ...admins.map((u) => toObjectId(u._id)),
      ...accountants.map((u) => toObjectId(u._id)),
    ];

    if (assignedTo) {
      recipients.push(toObjectId(assignedTo));
    }

    const createdBy = toObjectId(req.user!.id);

    await sendNotification({
      type: "Client Added",
      message: `New client created: ${client.name}`,
      client_id: toObjectId(client._id),
      company_id: toObjectId(company_id),
      createdBy,
      recipients,
    });

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

    // 🔥 Notification Logic
    // ----------------------------------------------------------

    const createdBy = toObjectId(req.user!.id);
    const companyId = toObjectId(client.company_id);

    // Fetch admins + accountants for this company
    const adminAndAccountantUsers = await User.find({
      company_id: companyId,
      role: { $in: [Roles.ADMIN, Roles.ACCOUNTANT] },
    }).lean();

    // Convert _id to ObjectId[]
    const roleRecipients = adminAndAccountantUsers.map((u) =>
      toObjectId(u._id)
    );

    // Assigned employee (optional)
    const employeeRecipient = client.assignedTo
      ? [toObjectId(client.assignedTo)]
      : [];

    const recipients = [...roleRecipients, ...employeeRecipient];

    // Send the notification
    await sendNotification({
      client_id: toObjectId(client._id),
      company_id: companyId,
      type: "Client Updated",
      message: `Client ${client.name} was updated.`,
      createdBy: createdBy,
      recipients,
    });

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

export const getClientsWithCompliance = async (req: Request, res: Response) => {
  try {
    const { company_id } = req.query;

    if (!company_id)
      return res.status(400).json({ message: "company_id is required" });

    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const loggedUser = req.user;
    const isEmployee = loggedUser.role === "Employee";

    // ------------------------------------------------
    // 1️⃣ Fetch clients
    // ------------------------------------------------
    let clients = await Client.find({ company_id }).lean();

    if (isEmployee) {
      clients = clients.filter(
        (c) => c.assignedTo?.toString() === loggedUser.id.toString()
      );
    }

    if (clients.length === 0) {
      return res.status(200).json({ clients: [] });
    }

    const clientIds = clients.map((c) => c._id);

    // ------------------------------------------------
    // 2️⃣ Fetch all monthly compliances (NO N+1)
    // ------------------------------------------------
    const allMonthly = await MonthlyCompliance.find({
      client_id: { $in: clientIds },
    }).lean();

    const monthlyMap = new Map<string, any[]>();
    for (const rec of allMonthly) {
      const key = rec.client_id.toString();
      if (!monthlyMap.has(key)) monthlyMap.set(key, []);
      monthlyMap.get(key)!.push(rec);
    }

    // ------------------------------------------------
    // 3️⃣ Fetch assigned users
    // ------------------------------------------------
    const userIds = clients.map((c) => c.assignedTo).filter(Boolean);

    const users = await User.find({ _id: { $in: userIds } })
      .select("name")
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

    // ------------------------------------------------
    // Helpers
    // ------------------------------------------------
    const normalize = (v?: string) => v?.trim().toLowerCase();
    const monthStr = (m: number, y: number) => `${m}-${y}`;

    const response: any[] = [];

    // ------------------------------------------------
    // 4️⃣ Build response per client
    // ------------------------------------------------
    for (const client of clients) {
      const monthlyRecords = monthlyMap.get(client._id.toString()) || [];

      const assignedName = client.assignedTo
        ? userMap.get(client.assignedTo.toString()) || "-"
        : "-";

      if (monthlyRecords.length === 0) {
        response.push({
          id: client._id,
          name: client.name,
          site: client.site || "-",
          assignedTo: assignedName,
          clientStatus: client.status,
          businessUnit: client.businessUnit || "-",
          lastDataStatus: "-",
          lastBillStatus: "-",
        });
        continue;
      }

      // ------------------------------------------------
      // ✅ CRITICAL FIX: sort newest → oldest
      // ------------------------------------------------
      monthlyRecords.sort((a, b) => {
        const yDiff = Number(b.year) - Number(a.year);
        if (yDiff !== 0) return yDiff;
        return Number(b.month) - Number(a.month);
      });

      // ------------------------------------------------
      // ✅ DATA STATUS (FIXED LOGIC)
      // ------------------------------------------------
      let dataStatus = "-";

      // Most recent month where data is received
      const latestReceived = monthlyRecords.find(
        (r) => normalize(r.dataReceiveStatus) === "data received"
      );

      if (latestReceived) {
        if (latestReceived.workProgress === "Completed") {
          dataStatus = `Data Complete ${monthStr(
            Number(latestReceived.month),
            Number(latestReceived.year)
          )}`;
        } else {
          dataStatus = `Data Received ${monthStr(
            Number(latestReceived.month),
            Number(latestReceived.year)
          )}`;
        }
      }

      // ------------------------------------------------
      // ✅ BILL STATUS (ALSO SAFE WITH FUTURE MONTHS)
      // ------------------------------------------------
      let billStatus = "-";

      const pendingBill = monthlyRecords.find(
        (r) =>
          normalize(r.dataReceiveStatus) === "data received" &&
          r.workProgress === "Completed" &&
          r.billStatus !== "Generated"
      );

      if (pendingBill) {
        billStatus = `Bill Pending ${monthStr(
          Number(pendingBill.month),
          Number(pendingBill.year)
        )}`;
      } else {
        const lastCompleted = monthlyRecords.find(
          (r) =>
            normalize(r.dataReceiveStatus) === "data received" &&
            r.workProgress === "Completed"
        );

        if (
          lastCompleted &&
          monthlyRecords.every(
            (r) =>
              normalize(r.dataReceiveStatus) === "data received" &&
              r.workProgress === "Completed" &&
              r.billStatus === "Generated"
          )
        ) {
          billStatus = `Bill Generated ${monthStr(
            Number(lastCompleted.month),
            Number(lastCompleted.year)
          )}`;
        }
      }

      // ------------------------------------------------
      // FINAL RESPONSE OBJECT
      // ------------------------------------------------
      response.push({
        id: client._id,
        name: client.name,
        site: client.site || "-",
        assignedTo: assignedName,
        clientStatus: client.status,
        businessUnit: client.businessUnit || "-",
        lastDataStatus: dataStatus,
        lastBillStatus: billStatus,

        // 🔥 ADD THIS
        monthlyCompliances: monthlyRecords.map((r) => ({
          month: r.month,
          year: r.year,
          dataReceiveStatus: r.dataReceiveStatus,
          workProgress: r.workProgress,
          billStatus: r.billStatus,
        })),
      });

    }

    res.status(200).json({ clients: response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getOverdueClients = async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.company_id;
    const userId = req.user!.id;
    const role = req.user!.role; 

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID missing from authenticated user.",
      });
    }

    // Base query for all roles
    const baseQuery: any = {
      company_id: companyId,
      isOverdue: true,
    };

    // If Employee → restrict to assigned clients
    if (role === "Employee") {
      baseQuery.assignedTo = userId;
    }

    const overdueClients = await Client.find(baseQuery)
      .populate("assignedTo", "name email")
      .populate("lastUpdatedBy", "name email")
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: overdueClients.length,
      data: overdueClients,
    });
  } catch (error) {
    console.error("Error fetching overdue clients:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching overdue clients",
    });
  }
};

