import { Router } from "express";
import authRoutes from "./auth.routes";
import companyRoutes from "./company.routes";
import userRoutes from "./user.routes";
import clientRoutes from "./client.routes"
import emailRoutes from "./email.routes"
import monthlyComplianceRoutes from "./monthlyCompliance.routes"
import notificationRoutes from "./notification.routes"
import ticketRoutes from "./ticket.routes"
import categoryRoutes from "./category.routes"
import licenseRoutes from "./license.routes"
import passwordRoutes from "./password.routes"
import dropdownRoutes from "./dropdown.routes"

const router = Router();

// Mount all routes here
router.use("/auth", authRoutes);
router.use("/company", companyRoutes);
router.use("/user", userRoutes);
router.use("/client", clientRoutes);
router.use("/email", emailRoutes);
router.use("/monthly-compliance", monthlyComplianceRoutes);
router.use("/notification", notificationRoutes)
router.use("/ticket", ticketRoutes)
router.use("/category", categoryRoutes)
router.use("/license", licenseRoutes)
router.use("/password", passwordRoutes)
router.use("/dropdown", dropdownRoutes)

export default router;
