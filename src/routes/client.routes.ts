import { Router } from "express";
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  getClientsWithCompliance,
  getOverdueClients
} from "../controllers/client.controller";
import { checkRole } from "../middlewares/checkRole";
import { Roles } from "../commons/roles";
import { authenticate } from "../middlewares/auth";

const router = Router();

// All routes require authentication first
router.use(authenticate);

router.get(
  "/overdue",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  getOverdueClients
);

router.get("/clients-with-compliance", getClientsWithCompliance);

router.post("/", checkRole([Roles.ADMIN]), createClient);

router.get("/", checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]), getClients);

router.get("/:id", checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]), getClientById);

router.put("/:id", checkRole([Roles.ADMIN, Roles.ACCOUNTANT]), updateClient);

router.delete("/:id", checkRole([Roles.ADMIN]), deleteClient);





export default router;
