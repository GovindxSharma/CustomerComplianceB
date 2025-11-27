import { Router } from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";
import { checkRole } from "../middlewares/checkRole";
import { Roles } from "../commons/roles";
import { authenticate } from "../middlewares/auth"; // JWT auth middleware

const router = Router();

// All routes require authentication first
router.use(authenticate);

// Admin-only routes
router.post("/", checkRole([Roles.ADMIN]), createCategory);
router.get("/", checkRole([Roles.ADMIN]), getCategories);
router.get("/:id", checkRole([Roles.ADMIN]), getCategoryById);
router.put("/:id", checkRole([Roles.ADMIN]), updateCategory);
router.delete("/:id", checkRole([Roles.ADMIN]), deleteCategory);

export default router;
