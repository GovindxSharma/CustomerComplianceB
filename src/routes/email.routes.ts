import express from "express";
import { sendWelcomeEmailController } from "../controllers/email.controller";
import { authenticate } from "../middlewares/auth";
import { upload } from "../middlewares/upload";


const router = express.Router();

router.post(
  "/send-welcome",
  authenticate,
  upload.array("attachments"), // "attachments" is the key in form-data
  sendWelcomeEmailController
);

export default router;
