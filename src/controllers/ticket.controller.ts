import { Request, Response } from "express";
import mongoose from "mongoose";
import { Ticket } from "../models/ticket.model";
import { Roles } from "../commons/roles";
import { User } from "../models/user.model";

// ---------------- CREATE TICKET ----------------
export const createTicket = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { title, description, priority, relatedClient } = req.body;
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
    const { status, assignedTo, comment } = req.body;

    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Admin can assign tickets
    if (assignedTo && req.user.role === Roles.ADMIN) {
      ticket.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    // Status update: only admins or assigned/raised user can update
    if (status) {
      if (
        req.user.role === Roles.ADMIN ||
        ticket.raisedBy.toString() === req.user.id ||
        (ticket.assignedTo && ticket.assignedTo.toString() === req.user.id)
      ) {
        ticket.status = status;

        // mark resolved by
        if (status === "Resolved" || status === "Closed") {
          ticket.isResolvedBy = new mongoose.Types.ObjectId(req.user.id);
          ticket.resolvedAt = new Date();
        }
      } else {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    // Add comment
    if (comment) {
      ticket.comments = ticket.comments || [];
      ticket.comments.push({
        user: new mongoose.Types.ObjectId(req.user.id),
        message: comment,
        timestamp: new Date(),
      });
    }

    await ticket.save();
    res.status(200).json({ message: "Ticket updated", ticket });
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
