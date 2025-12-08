import { Router } from "express";
import {
  createPassword,
  getAllPasswords,
  updatePassword,
  deletePassword,
  decryptPasswords,
} from "../controllers/password.controller";
import { authenticate } from "../middlewares/auth";
import { checkRole } from "../middlewares/checkRole";
import { Roles } from "../commons/roles";

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post(
  "/decrypt/:id",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  decryptPasswords
);


router.post(
  "/",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  createPassword
);
router.get(
  "/",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  getAllPasswords
);
router.put(
  "/:id",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  updatePassword
);
router.delete(
  "/:id",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  deletePassword
);

export default router;
