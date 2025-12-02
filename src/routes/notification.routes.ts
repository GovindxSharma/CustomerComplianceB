import { Router } from "express";
import {
  createNotification,
  getNotificationsByRecipient,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from "../controllers/notification.controller";

import { authenticate } from "../middlewares/auth";
import { checkRole } from "../middlewares/checkRole";
import { Roles } from "../commons/roles";

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get(
  "/unreadCount/:userId",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  getUnreadCount
);


/**
 * CREATE a notification
 * Only admins or accountants can trigger system notifications
 */
router.post(
  "/",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT]),
  createNotification
);

/**
 * GET notifications for a specific recipient
 * Any authenticated user can see their own notifications
 */
router.get(
  "/recipient/:recipient_id",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  getNotificationsByRecipient
);

/**
 * MARK a single notification as read
 */
router.put(
  "/read/:notification_id",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  markAsRead
);

/**
 * MARK ALL notifications as read for a user
 */
router.put(
  "/read-all/:recipient_id",
  checkRole([Roles.ADMIN, Roles.ACCOUNTANT, Roles.EMPLOYEE]),
  markAllAsRead
);

export default router;
