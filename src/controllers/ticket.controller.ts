import { Request, Response } from "express";
import mongoose from "mongoose";
import { Ticket } from "../models/ticket.model";
import { Roles } from "../commons/roles";
import { User } from "../models/user.model";

// ---------------- CREATE TICKET ----------------
export const createTicket = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { title, description, priority, relatedClient, assignedTo } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const ticket = await Ticket.create({
      company_id: req.user.company_id,
      title,
      description,
      priority,
      raisedBy: new mongoose.Types.ObjectId(req.user.id),
      relatedClient: relatedClient
        ? new mongoose.Types.ObjectId(relatedClient)
        : undefined,
      assignedTo: assignedTo
        ? new mongoose.Types.ObjectId(assignedTo)
        : undefined,
    });

    res.status(201).json({ message: "Ticket created", ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- GET TICKETS ----------------
export const getTickets = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    let query: any = { company_id: req.user.company_id };

    if (req.user.role !== Roles.ADMIN) {
      // Regular users see only their raised or assigned tickets
      query = {
        ...query,
        $or: [
          { raisedBy: new mongoose.Types.ObjectId(req.user.id) },
          { assignedTo: new mongoose.Types.ObjectId(req.user.id) },
        ],
      };
    }

    const tickets = await Ticket.find(query)
      .populate("raisedBy", "name email role")
      .populate("assignedTo", "name email role")
      .populate("relatedClient", "name contactPerson");

    res.status(200).json({ tickets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- GET TICKET BY ID ----------------
export const getTicketById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const ticket = await Ticket.findById(id)
      .populate("raisedBy", "name email role")
      .populate("assignedTo", "name email role")
      .populate("relatedClient", "name contactPerson");

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // ---- FIX START ----
    const raisedById = ticket.raisedBy?._id.toString();
    const assignedToId = ticket.assignedTo?._id.toString() ?? null;
    // ---- FIX END ----

    if (raisedById !== req.user.id && assignedToId !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.status(200).json({ ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// ---------------- UPDATE TICKET ----------------
export const updateTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      priority,
      status,
      assignedTo,
      clientId,
      comment,
    } = req.body;

    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    const isAdmin = req.user.role === Roles.ADMIN;
    const isRaisedUser = ticket.raisedBy.toString() === req.user.id;
    const isAssignedUser =
      ticket.assignedTo && ticket.assignedTo.toString() === req.user.id;

    // ---------- BASIC FIELD UPDATES (Admin or the user who raised it) ----------
    if (isAdmin || isRaisedUser) {
      if (title) ticket.title = title;
      if (description) ticket.description = description;
      if (priority) ticket.priority = priority;

      // related client update
      if (clientId) {
        ticket.relatedClient = new mongoose.Types.ObjectId(clientId);
      }
    }

    // ---------- ASSIGNMENT (Admin only) ----------
    if (assignedTo && isAdmin) {
      ticket.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    // ---------- STATUS UPDATE (Admin, raisedBy, or assigned user) ----------
    if (status) {
      if (isAdmin || isRaisedUser || isAssignedUser) {
        ticket.status = status;

        if (status === "Resolved" || status === "Closed") {
          ticket.isResolvedBy = new mongoose.Types.ObjectId(req.user.id);
          ticket.resolvedAt = new Date();
        }
      } else {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    // ---------- ADD COMMENT ----------
    if (comment) {
      ticket.comments = ticket.comments || [];
      ticket.comments.push({
        user: new mongoose.Types.ObjectId(req.user.id),
        message: comment,
        timestamp: new Date(),
      });
    }

    await ticket.save();

    res.status(200).json({
      message: "Ticket updated",
      ticket,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


// ---------------- DELETE TICKET (optional, admin only) ----------------
export const deleteTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    if (req.user.role !== Roles.ADMIN) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const ticket = await Ticket.findByIdAndDelete(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    res.status(200).json({ message: "Ticket deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getResolvedTickets = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const isAdmin = req.user.role === Roles.ADMIN;

    let filter: any = {
      status: { $in: ["Resolved", "Closed"] },
    };

    // Admin → can view all resolved tickets
    if (!isAdmin) {
      filter.$or = [{ raisedBy: req.user.id }, { assignedTo: req.user.id }];
    }

    const tickets = await Ticket.find(filter)
      .populate("raisedBy", "name email")
      .populate("assignedTo", "name email")
      .populate("relatedClient", "name")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      message: "Resolved tickets fetched",
      tickets,
    });
  } catch (err) {
    console.error("Get Resolved Tickets Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

