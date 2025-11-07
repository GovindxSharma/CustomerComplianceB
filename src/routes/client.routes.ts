import { Router } from "express";
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
} from "../controllers/client.controller";
import { checkRole } from "../middlewares/checkRole";
import { Roles } from "../commons/roles";
import { authenticate } from "../middlewares/auth";

const router = Router();

// All routes require authentication first
router.use(authenticate);

router.post("/", checkRole([Roles.ADMIN]), createClient);

router.get("/", checkRole([Roles.ADMIN, Roles.ACCOUNTANT]), getClients);

router.get("/:id", checkRole([Roles.ADMIN, Roles.ACCOUNTANT]), getClientById);

router.put("/:id", checkRole([Roles.ADMIN]), updateClient);

router.delete("/:id", checkRole([Roles.ADMIN]), deleteClient);

export default router;
