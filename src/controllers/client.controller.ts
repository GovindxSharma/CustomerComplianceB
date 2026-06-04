import { Request, Response } from "express";
import { Client } from "../models/client.model";
import { generateMonthlyComplianceRecordsForClient } from "../helpers/monthlyCompliance.helper";
import mongoose from "mongoose";
import { MonthlyCompliance } from "../models/monthlyCompliance.model";
import { User } from "../models/user.model";
import { sendNotification } from "../utils/notificationService";
import { Roles } from "../commons/roles";

const toObjectId = (value: any): mongoose.Types.ObjectId =>
  new mongoose.Types.ObjectId(String(value));

// ─── Create client ────────────────────────────────────────────────────────────
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

    if (!name || !contactPerson || !contactNumber || !email || !businessUnit || !site || !startMonth || !startYear || !company_id) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (
      !name.trim() ||
      !contactPerson.trim() ||
      !contactNumber.trim() ||
      !email.trim() ||
      !businessUnit.trim() ||
      !site.trim() ||
      !startMonth.toString().trim() ||
      !startYear.toString().trim()
    ) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    if (!/^[A-Za-z0-9\s\-&:\(\)\[\].,\/_]+$/.test(name.trim())) {
      return res.status(400).json({ message: "Client name contains invalid characters", field: "name" });
    }

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(email.trim())) {
      return res.status(400).json({ message: "Enter a valid email address", field: "email" });
    }

    if (!/^\d{10}$/.test(contactNumber.trim())) {
      return res.status(400).json({ message: "Contact number must be exactly 10 digits", field: "contactNumber" });
    }

    if (gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber.trim())) {
      return res.status(400).json({ message: "Enter a valid 15-character GST number", field: "gstNumber" });
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
      startMonth: startMonthNum.toString(),
      startYear: startYearNum,
    });

    // Backfill compliance records from startMonth/startYear up to today
    await generateMonthlyComplianceRecordsForClient(
      client._id as mongoose.Types.ObjectId,
      startMonthNum,
      startYearNum,
    );

    // ── Notifications ─────────────────────────────────────────────────────
    const admins = await User.find({ company_id, role: Roles.ADMIN });
    const accountants = await User.find({ company_id, role: Roles.ACCOUNTANT });

    const recipients: mongoose.Types.ObjectId[] = [
      ...admins.map((u) => toObjectId(u._id)),
      ...accountants.map((u) => toObjectId(u._id)),
    ];

    if (assignedTo) recipients.push(toObjectId(assignedTo));

    await sendNotification({
      type: "Client Added",
      message: `New client created: ${client.name}`,
      client_id: toObjectId(client._id),
      company_id: toObjectId(company_id),
      createdBy: toObjectId(req.user!.id),
      recipients,
    });

    res.status(201).json({ message: "Client created successfully", client });
  } catch (err: any) {
    console.error(err);
    // Handle MongoDB duplicate key errors as a safety net
    if (err.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern || {})[0] as string;

const fieldMessages: Record<string, string> = {
  email: "A client with this email already exists",
  contactNumber: "A client with this phone number already exists",
  gstNumber: "A client with this GST number already exists",
};

return res.status(400).json({
  message:
    fieldMessages[duplicateField] || "Duplicate value detected",
  field: duplicateField,
});
    }
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Get all clients for a company ───────────────────────────────────────────
export const getClients = async (req: Request, res: Response) => {
  try {
    const { company_id, assignedTo } = req.query;

    if (!company_id) {
      return res.status(400).json({ message: "company_id is required" });
    }

    const filter: Record<string, any> = { company_id };

    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    const clients = await Client.find(filter).sort({ name: 1 });
    res.status(200).json({ clients });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Get client by ID ─────────────────────────────────────────────────────────
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

// ─── Update client ────────────────────────────────────────────────────────────
export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingClient = await Client.findById(id);
    if (!existingClient) return res.status(404).json({ message: "Client not found" });

    const company_id = existingClient.company_id;

    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        return res.status(400).json({ message: "Client name is required", field: "name" });
      }
      if (!/^[A-Za-z0-9\s\-&:\(\)\[\].,\/_]+$/.test(trimmedName)) {
        return res.status(400).json({ message: "Client name contains invalid characters", field: "name" });
      }
    }

    if (updates.contactPerson !== undefined) {
      if (!updates.contactPerson.trim()) {
        return res.status(400).json({ message: "Contact person is required", field: "contactPerson" });
      }
    }

    if (updates.businessUnit !== undefined) {
      if (!updates.businessUnit.trim()) {
        return res.status(400).json({ message: "Company name is required", field: "businessUnit" });
      }
    }

    if (updates.site !== undefined) {
      if (!updates.site.trim()) {
        return res.status(400).json({ message: "Business unit is required", field: "site" });
      }
    }

    if (updates.startMonth !== undefined) {
      if (updates.startMonth === null || updates.startMonth === undefined || updates.startMonth.toString().trim() === "") {
        return res.status(400).json({ message: "Start month is required", field: "startMonth" });
      }
    }

    if (updates.startYear !== undefined) {
      if (!updates.startYear || updates.startYear.toString().trim() === "") {
        return res.status(400).json({ message: "Start year is required", field: "startYear" });
      }
    }

    if (updates.email !== undefined) {
      const trimmedEmail = updates.email.trim();
      if (!trimmedEmail) {
        return res.status(400).json({ message: "Email is required", field: "email" });
      }
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
        return res.status(400).json({ message: "Enter a valid email address", field: "email" });
      }
    }

    if (updates.contactNumber !== undefined) {
      const trimmedPhone = updates.contactNumber.trim();
      if (!trimmedPhone) {
        return res.status(400).json({ message: "Contact number is required", field: "contactNumber" });
      }
      if (!/^\d{10}$/.test(trimmedPhone)) {
        return res.status(400).json({ message: "Contact number must be exactly 10 digits", field: "contactNumber" });
      }
    }

    if (updates.gstNumber !== undefined && updates.gstNumber.trim() !== "") {
      const trimmedGst = updates.gstNumber.trim();
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(trimmedGst)) {
        return res.status(400).json({ message: "Enter a valid 15-character GST number", field: "gstNumber" });
      }
    }

    const client = await Client.findByIdAndUpdate(id, updates, { new: true });
    if (!client) return res.status(404).json({ message: "Client not found" });

    const createdBy = toObjectId(req.user!.id);
    const companyId = toObjectId(client.company_id);

    const adminAndAccountantUsers = await User.find({
      company_id: companyId,
      role: { $in: [Roles.ADMIN, Roles.ACCOUNTANT] },
    }).lean();

    const recipients = [
      ...adminAndAccountantUsers.map((u) => toObjectId(u._id)),
      ...(client.assignedTo ? [toObjectId(client.assignedTo)] : []),
    ];

    await sendNotification({
      client_id: toObjectId(client._id),
      company_id: companyId,
      type: "Client Updated",
      message: `Client ${client.name} was updated.`,
      createdBy,
      recipients,
    });

    res.status(200).json({ message: "Client updated", client });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Delete client ────────────────────────────────────────────────────────────
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

// ─── Get clients with compliance summary ──────────────────────────────────────
export const getClientsWithCompliance = async (req: Request, res: Response) => {
  try {
    const {
      company_id,
      searchText,
      employee,
      dataStatus,
      workProgress,
      billStatus,
      month,
      year,
      category_id,
    } = req.query as Record<string, string>;

    if (!company_id) {
      return res.status(400).json({ message: "company_id is required" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const loggedUser = req.user;
    const isEmployee = loggedUser.role === "Employee";

    // ── 1. Client query ───────────────────────────────────────────────────
    const clientQuery: any = { company_id };

    if (isEmployee) {
      clientQuery.assignedTo = loggedUser.id;
    } else if (employee) {
      if (mongoose.Types.ObjectId.isValid(employee)) {
        clientQuery.assignedTo = employee;
      } else {
        const user = await User.findOne({ name: employee }).select("_id");
        if (user) {
          clientQuery.assignedTo = user._id;
        } else {
          return res.status(200).json({ clients: [] });
        }
      }
    }

    const clients = await Client.find(clientQuery).lean();
    if (clients.length === 0) return res.status(200).json({ clients: [] });

    const clientIds = clients.map((c) => c._id);

    // ── 2. Fetch full monthly history ─────────────────────────────────────
    const allMonthly = await MonthlyCompliance.find({
      client_id: { $in: clientIds },
    }).lean();

    const monthlyMap = new Map<string, any[]>();
    for (const rec of allMonthly) {
      const key = rec.client_id.toString();
      if (!monthlyMap.has(key)) monthlyMap.set(key, []);
      monthlyMap.get(key)!.push(rec);
    }

    // ── 3. Resolve assigned user names ────────────────────────────────────
    const userIds = clients.map((c) => c.assignedTo).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } })
      .select("name")
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u.name]));

    // ── Helpers ───────────────────────────────────────────────────────────
    const normalize = (v?: string) => v?.trim().toLowerCase();
    const monthStr = (m: number, y: number) => `${m}-${y}`;

    // ── 4. Process each client ────────────────────────────────────────────
    const response: any[] = [];

    for (const client of clients) {
      const fullMonthly = monthlyMap.get(client._id.toString()) || [];
      const assignedName = client.assignedTo
        ? userMap.get(client.assignedTo.toString()) || "-"
        : "-";

      // Sort DESC (most recent first)
      fullMonthly.sort((a, b) => {
        const yDiff = Number(b.year) - Number(a.year);
        if (yDiff !== 0) return yDiff;
        return Number(b.month) - Number(a.month);
      });

      // ── Global data status ─────────────────────────────────────────────
      let dataStatusText = "-";
      const latestReceived = fullMonthly.find(
        (r) => normalize(r.dataReceiveStatus) === "data received",
      );
      if (latestReceived) {
        dataStatusText =
          latestReceived.workProgress === "Completed"
            ? `Data Complete ${monthStr(Number(latestReceived.month), Number(latestReceived.year))}`
            : `Data Received ${monthStr(Number(latestReceived.month), Number(latestReceived.year))}`;
      }

      // ── Global bill status ─────────────────────────────────────────────
      let billStatusText = "-";
      const pendingBill = fullMonthly.find(
        (r) =>
          normalize(r.dataReceiveStatus) === "data received" &&
          r.workProgress === "Completed" &&
          r.billStatus !== "Generated",
      );
      if (pendingBill) {
        billStatusText = `Bill Pending ${monthStr(Number(pendingBill.month), Number(pendingBill.year))}`;
      } else {
        const lastCompleted = fullMonthly.find(
          (r) =>
            normalize(r.dataReceiveStatus) === "data received" &&
            r.workProgress === "Completed",
        );
        if (lastCompleted) {
          billStatusText = `Bill Generated ${monthStr(Number(lastCompleted.month), Number(lastCompleted.year))}`;
        }
      }

      // ── Month-level filter ─────────────────────────────────────────────
      const filteredMonthly = fullMonthly.filter((r) => {
        if (month && r.month !== month) return false;
        if (year && Number(r.year) !== Number(year)) return false;
        if (category_id && r.category_id?.toString() !== category_id.toString())
          return false;
        if (
          dataStatus &&
          normalize(r.dataReceiveStatus) !== normalize(dataStatus)
        )
          return false;
        if (
          workProgress &&
          normalize(r.workProgress) !== normalize(workProgress)
        )
          return false;
        if (billStatus && normalize(r.billStatus) !== normalize(billStatus))
          return false;
        return true;
      });

      // Skip client if month-level filters are active but nothing matched
      if (
        (month || year || dataStatus || workProgress || billStatus) &&
        filteredMonthly.length === 0
      ) {
        continue;
      }

      // ── Client-level search ────────────────────────────────────────────
      if (searchText && searchText.trim()) {
        const needle = searchText.trim().replace(/\s+/g, " ").toLowerCase();
        const haystack = [client.name, client.businessUnit, client.site]
          .filter((v): v is string => !!v)
          .map((v) => v.trim().replace(/\s+/g, " ").toLowerCase())
          .join(" ");
        if (!haystack.includes(needle)) continue;
      }

      response.push({
        id: client._id,
        name: client.name,
        site: client.site || "-",
        assignedTo: assignedName,
        clientStatus: client.status,
        businessUnit: client.businessUnit || "-",
        lastDataStatus: dataStatusText,
        lastBillStatus: billStatusText,
        monthlyCompliances: filteredMonthly.map((r) => ({
          month: r.month,
          year: r.year,
          dataReceiveStatus: r.dataReceiveStatus,
          workProgress: r.workProgress,
          billStatus: r.billStatus,
          noOfWorkers: r.workersAsPerData,
          bill: r.actualBill,
          category_id: r.category_id, // fixed typo: was catrgory_id
        })),
      });
    }

    return res.status(200).json({ clients: response });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── Get overdue clients ──────────────────────────────────────────────────────
export const getOverdueClients = async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.company_id;
    const userId = req.user!.id;
    const role = req.user!.role;

    if (!companyId) {
      return res
        .status(400)
        .json({ message: "Company ID missing from authenticated user." });
    }

    const baseQuery: any = { company_id: companyId, isOverdue: true };
    if (role === "Employee") baseQuery.assignedTo = userId;

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
