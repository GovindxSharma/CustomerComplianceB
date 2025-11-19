// src/routes/ticket.routes.ts
import { Router } from "express";
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
} from "../controllers/ticket.controller";

import { authenticate } from "../middlewares/auth";
import { checkRole } from "../middlewares/checkRole";
import { Roles } from "../commons/roles";

const router = Router();

// All ticket routes require authentication
router.use(authenticate);

// Create Ticket → Admin + Accountant + Employee
router.post(
  "/",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  createTicket
);

// Get all tickets → Admin + Accountant + Employee
router.get(
  "/",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  getTickets
);

// Get ticket by ID → Admin + Accountant + Employee
router.get(
  "/:id",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  getTicketById
);

// Update Ticket → Role logic handled in controller
router.put("/:id", updateTicket);

// Delete Ticket → Admin only
router.delete("/:id", checkRole([Roles.ADMIN]), deleteTicket);

export default router;
