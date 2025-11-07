import { Router } from "express";
import companyRoutes from "./company.routes";
import userRoutes from "./user.routes";


const router = Router();

// Mount all routes here
router.use("/company", companyRoutes);
router.use("/user", userRoutes);


// Future routes:
// router.use("/users", userRoutes);
// router.use("/clients", clientRoutes);
// router.use("/monthly-compliance", monthlyComplianceRoutes);
// router.use("/passwords", passwordRoutes);
// etc.

export default router;
