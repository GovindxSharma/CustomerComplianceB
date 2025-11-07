import { Router } from "express";
import authRoutes from "./auth.routes";
import companyRoutes from "./company.routes";
import userRoutes from "./user.routes";
import clientRoutes from "./client.routes"


const router = Router();

// Mount all routes here
router.use("/auth", authRoutes);
router.use("/company", companyRoutes);
router.use("/user", userRoutes);
router.use("/client", clientRoutes);

export default router;
