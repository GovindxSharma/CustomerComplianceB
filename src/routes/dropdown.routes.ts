import { Router } from "express";
import {
  createDropdown,
  getDropdowns,
  getDropdownById,
  updateDropdown,
  deleteDropdown,
} from "../controllers/dropdown.controller";
import { checkRole } from "../middlewares/checkRole";
import { Roles } from "../commons/roles";
import { authenticate } from "../middlewares/auth"; // JWT auth middleware

const router = Router();

// All routes require authentication first
router.use(authenticate);

router.post("/",
    checkRole([Roles.ADMIN]),
    createDropdown);

router.get("/",
    checkRole([Roles.ADMIN, Roles.EMPLOYEE, Roles.ACCOUNTANT]),
    getDropdowns);

router.get("/:id",
    checkRole([Roles.ADMIN, Roles.EMPLOYEE, Roles.ACCOUNTANT]),
    getDropdownById);

router.put("/:id",
    checkRole([Roles.ADMIN]),
    updateDropdown);

router.delete("/:id",
    checkRole([Roles.ADMIN]),
    deleteDropdown);

export default router;
