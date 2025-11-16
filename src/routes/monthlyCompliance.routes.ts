// src/routes/monthlyCompliance.routes.ts
import { Router } from "express";
import {
  createMonthlyCompliance,
  getMonthlyComplianceByClient,
  getMonthlyComplianceById,
  updateMonthlyCompliance,
  deleteMonthlyCompliance,
} from "../controllers/monthlyCompliance.controller";
import { checkRole } from "../middlewares/checkRole";
import { Roles } from "../commons/roles";
import { authenticate } from "../middlewares/auth";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create monthly compliance (Admin only)
router.post("/", checkRole([Roles.ADMIN]), createMonthlyCompliance);

// Get all records for a client (Admin, Accountant, Employee)
router.get(
  "/client/:clientId",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  getMonthlyComplianceByClient
);

// Get a single record by ID (Admin, Accountant, Employee)
router.get("/:id", checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]), getMonthlyComplianceById);

// Update record (role-based inside controller)
router.put("/:id", updateMonthlyCompliance); // controller handles role logic

// Delete record (Admin only)
router.delete("/:id", checkRole([Roles.ADMIN]), deleteMonthlyCompliance);

export default router;
