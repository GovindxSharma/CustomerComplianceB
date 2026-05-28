import { Router } from "express";
import {
  createReminder,
  getReminders,
  getActiveReminders,
  updateReminder,
  snoozeReminder,
  dismissReminder,
  deleteReminder,
} from "../controllers/reminder.controller";

import { authenticate } from "../middlewares/auth";
import { checkRole } from "../middlewares/checkRole";
import { Roles } from "../commons/roles";

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * CREATE a new reminder
 */
router.post(
  "/",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  createReminder
);

/**
 * GET all reminders for the logged-in user
 */
router.get(
  "/",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  getReminders
);

/**
 * GET active (non-dismissed) reminders for the logged-in user
 */
router.get(
  "/active",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  getActiveReminders
);

/**
 * UPDATE a reminder's message/time
 */
router.put(
  "/:id",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  updateReminder
);

/**
 * SNOOZE a reminder (update reminderTime)
 */
router.put(
  "/:id/snooze",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  snoozeReminder
);

/**
 * DISMISS a reminder
 */
router.put(
  "/:id/dismiss",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  dismissReminder
);

/**
 * DELETE a reminder permanently
 */
router.delete(
  "/:id",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  deleteReminder
);

export default router;
