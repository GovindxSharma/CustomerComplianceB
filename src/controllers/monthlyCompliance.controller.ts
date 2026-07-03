// src/controllers/monthlyCompliance.controller.ts
import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { MonthlyCompliance } from "../models/monthlyCompliance.model";
import { Roles } from "../commons/roles";
import { Category } from "../models/category.model";
import { sendNotification } from "../utils/notificationService";
import { User } from "../models/user.model";
import { Client } from "../models/client.model";

// Helper to generate monthly records for a client
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getMonthName = (monthStr: string): string => {
  const idx = parseInt(monthStr, 10) - 1;
  return MONTH_NAMES[idx] ?? monthStr;
};

// Helper to generate monthly records for a client
export const generateMonthlyComplianceForClient = async (
  clientId: string,
  startMonth: number,
  startYear: number,
  categories: mongoose.Types.ObjectId[]
) => {
  const current = new Date();
  const records: any[] = [];

  let year = startYear;
  let month = startMonth;

  while (
    year < current.getFullYear() ||
    (year === current.getFullYear() && month <= current.getMonth() + 1)
  ) {
    for (const categoryId of categories) {
      records.push({
        client_id: clientId,
        month: month.toString().padStart(2, "0"),
        year,
        category_id: categoryId,
      });
    }

    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  if (records.length > 0) {
    await MonthlyCompliance.insertMany(records);
  }
};

// Create / add a new monthly compliance manually (Admin only)
export const createMonthlyCompliance = async (req: Request, res: Response) => {
  try {
    const { client_id, month, year } = req.body;
    if (!client_id || !month || !year) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const paddedMonth = month.toString().padStart(2, "0");
    const yearNum = Number(year);

    const exists = await MonthlyCompliance.findOne({
      client_id,
      month: paddedMonth,
      year: yearNum,
    }).lean();

    if (exists) {
      return res.status(400).json({
        message: "Compliance record for this month and year already exists",
      });
    }

    const record = await MonthlyCompliance.create({
      client_id,
      month: paddedMonth,
      year: yearNum,
      category_id: null,
      dataReceiveStatus: "Not Received",
      workProgress: "Not Started",
      billStatus: "Pending",
    });
    res.status(201).json({ message: "Monthly compliance created", record });
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(400).json({
        message: "Compliance record for this month and year already exists",
      });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMonthlyComplianceByClient = async (
  req: Request,
  res: Response,
) => {
  try {
    const { clientId } = req.params;
    const { month, year, dataStatus, workProgress, billStatus } = req.query;

    const loggedUser = req.user;
    if (!loggedUser) return res.status(401).json({ message: "Unauthorized" });

    const client = await Client.findById(clientId).lean();
    if (!client) return res.status(404).json({ message: "Client not found" });

    // ---------------- ROLE-BASED ACCESS ----------------
    if (
      loggedUser.role === Roles.EMPLOYEE &&
      client.assignedTo?.toString() !== loggedUser.id.toString()
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // ---------------- BUILD FILTER ----------------
    const filter: any = { client_id: clientId };

    if (month) filter.month = month;
    if (year) filter.year = Number(year);
    if (dataStatus) filter.dataReceiveStatus = dataStatus;
    if (workProgress) filter.workProgress = workProgress;
    if (billStatus) filter.billStatus = billStatus;

    // ---------------- FETCH RECORDS ----------------
    const records = await MonthlyCompliance.find(filter)
      .populate({
        path: "category_id",
        select: "name",
      })
      .sort({ year: -1, month: -1 }) // newest → oldest
      .lean();

    return res.status(200).json(records);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get a single record by ID
export const getMonthlyComplianceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = await MonthlyCompliance.findById(id).populate(
      "category_id",
      "name"
    );
    if (!record) return res.status(404).json({ message: "Record not found" });
    res.status(200).json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateMonthlyCompliance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      dataReceiveStatus,
      workProgress,
      expectedBill,
      actualBill,
      billStatus,
      remarks,
      workersAsPerData,
    } = req.body;

    const record = await MonthlyCompliance.findById(id).populate("client_id");
    if (!record) return res.status(404).json({ message: "Record not found" });
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const role = req.user.role;

    // ----------------- DETECT CHANGES -----------------
    const changes: {
      type: "Data Received" | "Progress Updated" | "Bill Generated";
      message: string;
    }[] = [];

    const clientData = record.client_id as any;
    const clientName = clientData.name || "Client";
    const clientId = clientData._id;
    const clientCompanyId = clientData.company_id;
    const assignedEmployee = clientData.assignedTo;
    const monthName = getMonthName(record.month);
    const recordYear = record.year;

    // Fetch name of the user performing the update
    const updatingUser = await User.findById(req.user.id).select("name").lean();
    const updaterName = (updatingUser as any)?.name || "Unknown User";

    // ----------------- ROLE-BASED UPDATES -----------------
    if (role === Roles.EMPLOYEE || role === Roles.ADMIN) {
      // Update Data Status
      if (dataReceiveStatus && dataReceiveStatus !== record.dataReceiveStatus) {
        record.dataReceiveStatus = dataReceiveStatus;
        changes.push({
          type: "Data Received",
          message: `Data Receive Status updated to '${dataReceiveStatus}' for ${clientName} | Month: ${monthName} ${recordYear} | Updated by: ${updaterName}`,
        });
      }

      // Update Work Progress
      if (workProgress && workProgress !== record.workProgress) {
        record.workProgress = workProgress;
        changes.push({
          type: "Progress Updated",
          message: `Work Progress updated to '${workProgress}' for ${clientName} | Month: ${monthName} ${recordYear} | Updated by: ${updaterName}`,
        });
      }

      // Update Remarks (Admins and Employees)
      if (remarks && remarks !== record.remarks) {
        record.remarks = remarks;
      }

      // Update number of workers and calculate expectedBill based on category
      if (workersAsPerData !== undefined) {
        const workers = Number(workersAsPerData);
        if (!isNaN(workers)) {
          // Fetch active categories
          const categories = await Category.find({ isActive: true });

          // Find the category range that matches the number of workers
          const matchedCategory = categories.find((cat) => {
            const [minStr, maxStr] = cat.name.split("-");
            const min = Number(minStr);
            const max = Number(maxStr);

            // Ensure min and max are valid numbers
            if (isNaN(min) || isNaN(max)) return false;

            return workers >= min && workers <= max;
          });

          if (matchedCategory) {
            record.expectedBill = matchedCategory.price;
            record.category_id =
              matchedCategory._id as mongoose.Schema.Types.ObjectId;
          }

          record.workersAsPerData = workers;
        }
      }

      // Admins can also update actualBill and billStatus
      if (role === Roles.ADMIN) {
        if (actualBill !== undefined && actualBill !== record.actualBill) {
          record.actualBill = actualBill;
        }
        if (billStatus && billStatus !== record.billStatus) {
          record.billStatus = billStatus;
          changes.push({
            type: "Bill Generated",
            message: `Bill Status updated to '${billStatus}' for ${clientName} | Month: ${monthName} ${recordYear} | Updated by: ${updaterName}`,
          });
        }
      }
    } else if (role === Roles.ACCOUNTANT) {
      // Accountants can only update bills
      if (expectedBill !== undefined && expectedBill !== record.expectedBill) {
        record.expectedBill = expectedBill;
      }
      if (actualBill !== undefined && actualBill !== record.actualBill) {
        record.actualBill = actualBill;
      }
      if (billStatus && billStatus !== record.billStatus) {
        record.billStatus = billStatus;
        changes.push({
          type: "Bill Generated",
          message: `Bill Status updated to '${billStatus}' for ${clientName} | Month: ${monthName} ${recordYear} | Updated by: ${updaterName}`,
        });
      }
      if (remarks && remarks !== record.remarks) {
        record.remarks = remarks;
      }
    } else {
      return res.status(403).json({ message: "Forbidden" });
    }

    // ----------------- SAVE RECORD -----------------
    record.updatedBy = new mongoose.Types.ObjectId(
      req.user.id
    ) as unknown as mongoose.Schema.Types.ObjectId;
    await record.save();

    // ----------------- FETCH RECIPIENTS -----------------
    const adminRecipients = await User.find(
      {
        role: Roles.ADMIN,
        company_id: clientCompanyId,
        _id: { $ne: req.user.id },
      },
      { _id: 1 }
    );

    const employeeRecipients: Types.ObjectId[] =
      assignedEmployee && assignedEmployee.toString() !== req.user.id
        ? [assignedEmployee]
        : [];

    const accountantRecipients =
      workProgress === "Completed"
        ? (
            await User.find(
              {
                role: Roles.ACCOUNTANT,
                company_id: clientCompanyId,
                _id: { $ne: req.user.id },
              },
              { _id: 1 }
            )
          ).map((u) => u._id as Types.ObjectId)
        : [];

    // ----------------- SEND NOTIFICATIONS -----------------
    for (const change of changes) {
      let recipients: Types.ObjectId[] = [];

      recipients.push(...adminRecipients.map((u) => u._id as Types.ObjectId));

      if (change.type === "Bill Generated") {
        recipients.push(...employeeRecipients);
      }

      if (change.type === "Progress Updated" && workProgress === "Completed") {
        recipients.push(...accountantRecipients);
      }

      // Remove duplicates
      recipients = [...new Set(recipients)];

      if (recipients.length > 0) {
        await sendNotification({
          client_id: clientId,
          company_id: clientCompanyId,
          type: change.type,
          message: change.message,
          createdBy: new mongoose.Types.ObjectId(req.user.id),
          recipients,
        });
      }
    }

    return res.status(200).json({ message: "Record updated", record });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete record (Admin only)
export const deleteMonthlyCompliance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await MonthlyCompliance.findByIdAndDelete(id);
    res.status(200).json({ message: "Record deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Cron-ready: generate current month records for all clients
export const generateCurrentMonthComplianceForClient = async (
  clientId: mongoose.Types.ObjectId
) => {
  const today = new Date();

  const month = today.getMonth() + 1; // current month
  const year = today.getFullYear();

  await MonthlyCompliance.updateOne(
    {
      client_id: clientId,
      month: month.toString().padStart(2, "0"),
      year,
    },
    {
      $setOnInsert: {
        client_id: clientId,
        month: month.toString().padStart(2, "0"),
        year,
        category_id: null,
        dataReceiveStatus: "Not Received",
        workProgress: "Not Started",
        billStatus: "Pending",
      },
    },
    { upsert: true }
  );
};


// Tab 1: Data Received & Progress Pending
export const getDataReceived = async (req: Request, res: Response) => {
  try {
const employeeId = req.user?.id;
if (!employeeId) {
  return res.status(401).json({ error: "Unauthorized" });
}

    const compliances = await MonthlyCompliance.find({
      workProgress: "Not Started",
      dataReceiveStatus: "Data Received",
    })
      .populate({
        path: "client_id",
        match: { assignedTo: employeeId },
        select: "name contactPerson contactNumber email",
      })
      .lean();

    const filtered = compliances
      .filter((c) => c.client_id) // remove nulls
      .map((c) => {
        const client = c.client_id as any; // or a proper interface
        return {
          complianceId: c._id,
          clientId: client._id,
          clientName: client.name,
          contactPerson: client.contactPerson,
          contactNumber: client.contactNumber,
          email: client.email,
          month: c.month,
          year: c.year,
          remarks: c.remarks || "",
          dataReceiveStatus: c.dataReceiveStatus,
          workProgress: c.workProgress,
        };
      });


    res.json({ clients: filtered });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// Tab 2: Data Complete
export const getDataComplete = async (req: Request, res: Response) => {
  try {
const employeeId = req.user?.id;
if (!employeeId) {
  return res.status(401).json({ error: "Unauthorized" });
}

    const compliances = await MonthlyCompliance.find({
      workProgress: "Completed",
      dataReceiveStatus: "Data Received",
    })
      .populate({
        path: "client_id",
        match: { assignedTo: employeeId },
        select: "name contactPerson contactNumber email",
      })
      .lean();

    const filtered = compliances
      .filter((c) => c.client_id) // remove nulls
      .map((c) => {
        const client = c.client_id as any; // or a proper interface
        return {
          complianceId: c._id,
          clientId: client._id,
          clientName: client.name,
          contactPerson: client.contactPerson,
          contactNumber: client.contactNumber,
          email: client.email,
          month: c.month,
          year: c.year,
          remarks: c.remarks || "",
          dataReceiveStatus: c.dataReceiveStatus,
          workProgress: c.workProgress,
          billStatus: c.billStatus,
        };
      });


    res.json({ clients: filtered });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Accountant: Data Complete but Bill Pending
export const getBillPending = async (req: Request, res: Response) => {
  try {
    const billPendingClients = await MonthlyCompliance.find({
      // dataReceiveStatus: "Data Received",
      workProgress: "Completed",
      billStatus: { $ne: "Generated" },
    })
      .populate(
        "client_id",
        "name contactPerson contactNumber email assignedTo"
      )
      .populate("category_id", "name")
      .sort({ year: -1, month: -1 });

    // Filter out any documents where client_id is null
    const clients = billPendingClients
      .filter((mc) => mc.client_id) // 🔹 skip null clients
      .map((mc) => {
        const client = mc.client_id as any;
        const category = mc.category_id as any;

        return {
          _id: mc._id,
          clientId: client._id,
          clientName: client.name,
          contactPerson: client.contactPerson || "-",
          contactNumber: client.contactNumber || "-",
          email: client.email || "-",
          month: mc.month,
          year: mc.year,
          category: category?.name || "-",
          remarks: mc.remarks || "-",
          billStatus: mc.billStatus,
        };
      });

    return res.json({ clients });
  } catch (error) {
    console.error("Error fetching bill pending clients:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Pending Bills Report for Admin
export const getPendingBillsReport = async (req: Request, res: Response) => {
  try {
    const loggedUser = req.user;
    if (!loggedUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const companyId = req.query.company_id || loggedUser.company_id;
    if (!companyId) {
      return res.status(400).json({ message: "company_id is required" });
    }

    // Calculate last month and last to last month dynamically
    const today = new Date();
    const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthStr = String(lastMonthDate.getMonth() + 1).padStart(2, "0");
    const lastMonthYear = lastMonthDate.getFullYear();

    const lastToLastMonthDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const lastToLastMonthStr = String(lastToLastMonthDate.getMonth() + 1).padStart(2, "0");
    const lastToLastMonthYear = lastToLastMonthDate.getFullYear();

    // 1. Fetch all active or inactive clients of the company
    const clients = await Client.find({ company_id: companyId })
      .populate({
        path: "assignedTo",
        select: "name email"
      })
      .lean();

    if (clients.length === 0) {
      return res.status(200).json({ data: [] });
    }

    const clientIds = clients.map(c => c._id);

    // 2. Fetch pending bill monthly compliance records for these clientIds, specifically for last two months
    const pendingCompliances = await MonthlyCompliance.find({
      client_id: { $in: clientIds },
      billStatus: "Pending",
      $or: [
        { month: lastMonthStr, year: lastMonthYear },
        { month: lastToLastMonthStr, year: lastToLastMonthYear }
      ]
    })
      .populate({
        path: "category_id",
        select: "name price"
      })
      .sort({ year: -1, month: -1 })
      .lean();

    // 3. Map the data to return a comprehensive structure
    const data = pendingCompliances.map((mc) => {
      const client = clients.find((c) => c._id.toString() === mc.client_id.toString());
      const category = mc.category_id as any;
      const employee = client?.assignedTo as any;

      return {
        _id: mc._id,
        clientId: client?._id,
        clientName: client?.name || "-",
        contactPerson: client?.contactPerson || "-",
        contactNumber: client?.contactNumber || "-",
        email: client?.email || "-",
        gstNumber: client?.gstNumber || "-",
        address: client?.address || "-",
        businessUnit: client?.businessUnit || "-",
        site: client?.site || "-",
        assignedEmployee: employee?.name || "-",
        assignedEmployeeEmail: employee?.email || "-",
        month: mc.month,
        year: mc.year,
        categoryName: category?.name || "-",
        workersAsPerData: mc.workersAsPerData || 0,
        expectedBill: mc.expectedBill || 0,
        actualBill: mc.actualBill || 0,
        billStatus: mc.billStatus || "Pending",
        workProgress: mc.workProgress || "Not Started",
        dataReceiveStatus: mc.dataReceiveStatus || "Not Received",
      };
    });

    return res.status(200).json({ data });
  } catch (error) {
    console.error("Error fetching pending bills report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Delete all extra month records (which are not supposed to be yet created)
export const deleteExtraMonthRecords = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const currentMonthVal = today.getMonth() + 1; // 1-indexed
    const currentYearVal = today.getFullYear();
    const currentMonthStr = currentMonthVal.toString().padStart(2, "0");

    const deleteQuery = {
      $or: [
        { year: { $gt: currentYearVal } },
        { year: currentYearVal, month: { $gt: currentMonthStr } },
        { year: { $lt: 2000 } }
      ]
    };

    // Find first to report what we deleted
    const recordsToDelete = await MonthlyCompliance.find(deleteQuery).select("_id client_id month year").lean();
    
    const result = await MonthlyCompliance.deleteMany(deleteQuery);

    return res.status(200).json({
      message: "Extra monthly compliance records deleted successfully",
      deletedCount: result.deletedCount,
      deletedRecords: recordsToDelete.map((r: any) => ({
        _id: r._id,
        client_id: r.client_id,
        month: r.month,
        year: r.year,
      })),
    });
  } catch (err) {
    console.error("[Cleanup Extra Records] ❌", err);
    return res.status(500).json({ message: "Server error during cleanup" });
  }
};

// Delete records for a specific month and year (Admin only)
export const deleteMonthlyComplianceByMonthYear = async (req: Request, res: Response) => {
  try {
    const { month, year } = { ...req.query, ...req.body };
    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    const paddedMonth = month.toString().padStart(2, "0");
    const yearNum = Number(year);

    if (isNaN(yearNum)) {
      return res.status(400).json({ message: "Invalid year" });
    }

    const deleteQuery = {
      month: paddedMonth,
      year: yearNum,
    };

    // Find first to report what we deleted
    const recordsToDelete = await MonthlyCompliance.find(deleteQuery).select("_id client_id month year").lean();
    const result = await MonthlyCompliance.deleteMany(deleteQuery);

    return res.status(200).json({
      message: `Monthly compliance records for ${paddedMonth}/${yearNum} deleted successfully`,
      deletedCount: result.deletedCount,
      deletedRecords: recordsToDelete.map((r: any) => ({
        _id: r._id,
        client_id: r.client_id,
        month: r.month,
        year: r.year,
      })),
    });
  } catch (err) {
    console.error("[Delete Month-Year Records] ❌", err);
    return res.status(500).json({ message: "Server error during deletion" });
  }
};