import { Request, Response } from "express";
import { sendEmail } from "../utils/emailService";

export const sendEmailController = async (req: Request, res: Response) => {
  try {
    const { to, subject, html, text } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!to || !subject) {
      return res.status(400).json({
        message: "to and subject are required",
      });
    }

    if (!html && !text) {
      return res.status(400).json({
        message: "Either html or text content must be provided",
      });
    }

    // ✅ Optional attachments (memory storage)
    const attachments =
      files?.map((file) => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      })) ?? [];

    // Respond immediately (non-blocking UX)
    res.status(200).json({
      message: "Email queued for sending",
    });

    // Fire & forget
    sendEmail({
      to,
      subject,
      html,
      text,
      ...(attachments.length > 0 && { attachments }),
    })
      .then(() => {
        console.log(
          `📨 Email sent to ${to} with ${attachments.length} attachment(s)`,
        );
      })
      .catch((error: any) => {
        console.error("❌ Email sending failed:", error);
      });
  } catch (error) {
    console.error("❌ Controller error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
