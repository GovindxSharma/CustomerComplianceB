import { Router } from "express";
import {
  createLicense,
  getLicenses,
  getLicenseById,
  updateLicense,
  deleteLicense,
} from "../controllers/license.controller";
import { authenticate } from "../middlewares/auth";
import { checkRole } from "../middlewares/checkRole";
import { Roles } from "../commons/roles";

const router = Router();

// All routes require authentication
router.use(authenticate);

// CRUD routes
router.post(
  "/",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  createLicense
);
router.get(
  "/",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  getLicenses
);
router.get(
  "/:id",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  getLicenseById
);
router.put(
  "/:id",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  updateLicense
);
router.delete("/:id", checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]), deleteLicense);

export default router;
