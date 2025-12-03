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

    const existing = await Client.findOne({ email, company_id });
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

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const loggedUser = req.user;
    const isEmployee = loggedUser.role === "Employee";

    let clients = await Client.find({ company_id }).lean();

    if (isEmployee) {
      clients = clients.filter(
        (client) => client.assignedTo?.toString() === loggedUser.id.toString()
      );
    }

    const response: any[] = [];

    const monthStr = (m: number, y: number) => `${m}-${y}`;

    for (const client of clients) {
      const monthlyRecords = await MonthlyCompliance.find({
        client_id: client._id,
      }).lean();

      let assignedName = "-";
      if (client.assignedTo) {
        const u = await User.findById(client.assignedTo).lean();
        if (u) assignedName = u.name;
      }

      if (!monthlyRecords || monthlyRecords.length === 0) {
        response.push({
          id: client._id,
          name: client.name,
          site: client.site || "-",
          assignedTo: assignedName,
          clientStatus: client.status,
          lastDataStatus: "Pending -",
          lastBillStatus: "-",
        });
        continue;
      }

      // Convert month/year to numbers & safely sort
      monthlyRecords.sort((a, b) => {
        const mA = Number(a.month);
        const yA = Number(a.year);
        const mB = Number(b.month);
        const yB = Number(b.year);
        return yA === yB ? mA - mB : yA - yB;
      });

      // --------------------------------------------------------
      // ✅ FIXED DATA LOGIC (With safe indexing + TS-safe checks)
      // --------------------------------------------------------

      let dataStatus = "-";

      const last = monthlyRecords[monthlyRecords.length - 1] ?? null;
      const secondLast =
        monthlyRecords.length > 1
          ? monthlyRecords[monthlyRecords.length - 2]
          : null;

      if (monthlyRecords.length === 1 && last) {
        const r = last;
        if (
          r.dataReceiveStatus === "Data Received" &&
          r.workProgress === "Completed"
        ) {
          dataStatus = `Data Complete ${monthStr(
            Number(r.month),
            Number(r.year)
          )}`;
        } else if (
          r.dataReceiveStatus === "Data Received" &&
          r.workProgress !== "Completed"
        ) {
          dataStatus = `Data Received ${monthStr(
            Number(r.month),
            Number(r.year)
          )}`;
        }
      } else if (last) {
        if (
          last.dataReceiveStatus === "Data Received" &&
          last.workProgress === "Completed"
        ) {
          dataStatus = `Data Complete ${monthStr(
            Number(last.month),
            Number(last.year)
          )}`;
        } else if (
          last.dataReceiveStatus === "Data Received" &&
          last.workProgress !== "Completed"
        ) {
          dataStatus = `Data Received ${monthStr(
            Number(last.month),
            Number(last.year)
          )}`;
        } else if (secondLast) {
          if (
            secondLast.dataReceiveStatus === "Data Received" &&
            secondLast.workProgress === "Completed"
          ) {
            dataStatus = `Data Complete ${monthStr(
              Number(secondLast.month),
              Number(secondLast.year)
            )}`;
          }
        }
      }

      // --------------------------------------------------------
      // ✅ BILL STATUS (your logic — TS-safe)
      // --------------------------------------------------------
      let billStatus = "-";

      for (const r of monthlyRecords) {
        if (!r) continue;

        const recMonth = Number(r.month);
        const recYear = Number(r.year);

        if (
          r.dataReceiveStatus === "Data Received" &&
          r.workProgress === "Completed"
        ) {
          if (r.billStatus !== "Generated") {
            billStatus = `Bill Pending ${monthStr(recMonth, recYear)}`;
            break;
          }
        }
      }

      if (billStatus === "-") {
        const allGenerated = monthlyRecords.every((r) => {
          if (!r) return false;
          return (
            r.dataReceiveStatus === "Data Received" &&
            r.workProgress === "Completed" &&
            r.billStatus === "Generated"
          );
        });

        if (allGenerated && last) {
          billStatus = `Bill Generated ${monthStr(
            Number(last.month),
            Number(last.year)
          )}`;
        }
      }

      // --------------------------------------------------------
      // FINAL RESPONSE
      // --------------------------------------------------------
      response.push({
        id: client._id,
        name: client.name,
        site: client.site || "-",
        assignedTo: assignedName,
        clientStatus: client.status,
        businessUnit: client.businessUnit || "-",
        lastDataStatus: dataStatus,
        lastBillStatus: billStatus,
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

