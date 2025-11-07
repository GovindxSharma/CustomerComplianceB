import { Router } from "express";
import {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
} from "../controllers/company.controller";
import { checkRole } from "../middlewares/checkRole";
import { Roles } from "../commons/roles";
import { authenticate } from "../middlewares/auth"; // JWT auth middleware

const router = Router();

// All routes require authentication first
router.use(authenticate);

router.post("/",
    checkRole([Roles.ADMIN]),
    createCompany);

router.get("/",
    checkRole([Roles.ADMIN]),
    getCompanies);

router.get("/:id",
    checkRole([Roles.ADMIN]),
    getCompanyById);

router.put("/:id",
    checkRole([Roles.ADMIN]),
    updateCompany);

router.delete("/:id",
    checkRole([Roles.ADMIN]),
    deleteCompany);

export default router;
