import { Router } from "express";
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
} from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth";
import { checkRole } from "../middlewares/checkRole";
import { Roles } from "../commons/roles";

const router = Router();

// Public login route
router.post("/login", loginUser);

// Protected routes
// router.use(authenticate);

// Only Admin can create users
router.post("/",
    // checkRole([Roles.ADMIN]),
    createUser);

// Admin & Accountant can view all users
router.get("/",
    // checkRole([Roles.ADMIN, Roles.ACCOUNTANT]),
    getUsers);

// Admin & Accountant can view single user
router.get("/:id",
    // checkRole([Roles.ADMIN, Roles.ACCOUNTANT]),
    getUserById);

// Only Admin can update or delete user
router.put("/:id",
    // checkRole([Roles.ADMIN]),
    updateUser);
router.delete("/:id",
    // checkRole([Roles.ADMIN]),
    deleteUser);

export default router;
