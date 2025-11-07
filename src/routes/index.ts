import { Router } from "express";
import authRoutes from "./auth.routes";
import companyRoutes from "./company.routes";
import userRoutes from "./user.routes";


const router = Router();

// Mount all routes here
router.use("/auth", authRoutes);
router.use("/company", companyRoutes);
router.use("/user", userRoutes);

export default router;
