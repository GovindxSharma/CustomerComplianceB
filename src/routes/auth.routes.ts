import { Router } from "express";
import {
  login,
  logout,
  getDashboardStats,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/dashboard-stats", authenticate, getDashboardStats);


export default router;
