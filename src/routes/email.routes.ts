import express from "express";
import { sendEmailController } from "../controllers/email.controller";
import { authenticate } from "../middlewares/auth";
import multer from "multer";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});


router.post(
  "/send-welcome",
  authenticate,
  upload.array("attachments"), // "attachments" is the key in form-data
  sendEmailController
);

export default router;
