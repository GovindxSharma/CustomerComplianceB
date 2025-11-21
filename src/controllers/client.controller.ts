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

    const clients = await Client.find({ company_id }).lean();
    const response: any[] = [];

    for (const client of clients) {
      const monthlyRecords = await MonthlyCompliance.find({
        client_id: client._id,
      }).lean();

      // Get assigned employee name
      let assignedName = "-";
      if (client.assignedTo) {
        const user = await User.findById(client.assignedTo).lean();
        if (user) assignedName = `${user.name}`;
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

      // Sort ascending → oldest to newest
      monthlyRecords.sort((a, b) => {
        const aVal = Number(`${a.year}${String(a.month).padStart(2, "0")}`);
        const bVal = Number(`${b.year}${String(b.month).padStart(2, "0")}`);
        return aVal - bVal;
      });

      const monthStr = (m: number, y: number) => `${m}-${y}`;

      // -----------------------------
      // DATA STATUS
      // -----------------------------
      let targetData = monthlyRecords.find(
        (rec) =>
          rec.dataReceiveStatus !== "Data Received" ||
          rec.workProgress !== "Completed"
      );
      if (!targetData) targetData = monthlyRecords[monthlyRecords.length - 1];

      const dataMonth = Number(targetData?.month ?? 0);
      const dataYear = Number(targetData?.year ?? 0);

      let dataStatus = "";
      if (targetData?.dataReceiveStatus !== "Data Received") {
        dataStatus = `Data Pending ${monthStr(dataMonth, dataYear)}`;
      } else {
        switch (targetData?.workProgress) {
          case "Not Started":
            dataStatus = `Data Progress Pending ${monthStr(
              dataMonth,
              dataYear
            )}`;
            break;
          case "In Progress":
            dataStatus = `Data In Progress ${monthStr(dataMonth, dataYear)}`;
            break;
          case "Completed":
            dataStatus = `Data Complete ${monthStr(dataMonth, dataYear)}`;
            break;
          default:
            dataStatus = `Data Pending ${monthStr(dataMonth, dataYear)}`;
        }
      }

      // -----------------------------
      // BILL STATUS (Independent)
      // -----------------------------
      let billStatus = "-";
      for (const record of monthlyRecords) {
        const recMonth = Number(record.month);
        const recYear = Number(record.year);

        if (
          record.dataReceiveStatus === "Data Received" &&
          record.workProgress === "Completed"
        ) {
          if (record.billStatus !== "Generated") {
            billStatus = `Bill Pending ${monthStr(recMonth, recYear)}`;
            break;
          }
        }
      }

      // If no pending bills, show last generated
      if (billStatus === "-") {
        const allGenerated = monthlyRecords.every(
          (r) =>
            r.dataReceiveStatus === "Data Received" &&
            r.workProgress === "Completed" &&
            r.billStatus === "Generated"
        );

        if (allGenerated && monthlyRecords.length > 0) {
          const last = monthlyRecords[monthlyRecords.length - 1];
          const lastMonth = Number(last?.month ?? 0);
          const lastYear = Number(last?.year ?? 0);
          billStatus = `Bill Generated ${monthStr(lastMonth, lastYear)}`;
        }
      }

      // -----------------------------
      // FINAL RESPONSE
      // -----------------------------
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
    const companyId = req.user!.company_id; // From auth middleware

    if (!companyId) {
      return res.status(400).json({
        message: "Company ID missing from authenticated user.",
      });
    }

    const overdueClients = await Client.find({
      company_id: companyId,
      isOverdue: true,
    })
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
