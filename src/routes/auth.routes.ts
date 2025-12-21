import { Router } from "express";
import {
  login,
  logout,
  getDashboardStats,
  getRevenueMonthly,
  getClientMonthlyStats
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/dashboard-stats", authenticate, getDashboardStats);
router.get("/client-monthly-stats", authenticate, getClientMonthlyStats);
router.get("/revenue-monthly", authenticate, getRevenueMonthly);


export default router;
