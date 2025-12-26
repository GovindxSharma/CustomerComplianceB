import { Request, Response } from "express";
import { sendEmail } from "../utils/emailService";
import { clientWelcomeEmail } from "../commons/emailContents";
import fs from "fs";

export const sendWelcomeEmailController = async (
  req: Request,
  res: Response
) => {
  try {
    const { contactPerson, companyName, email } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!email || !contactPerson || !companyName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Convert files to Resend-compatible attachments
    const attachments =
      files?.map((file) => ({
        filename: file.originalname,
        content: fs.readFileSync(file.path), // 🔥 IMPORTANT
      })) ?? [];

    const htmlContent = clientWelcomeEmail(contactPerson, companyName);

    // ✅ Respond immediately (non-blocking)
    res.status(200).json({ message: "Email queued for sending" });

    // 🚀 Fire-and-forget
    sendEmail({
      to: email,
      subject: "Welcome to CCS - Contractor Compliance Services",
      html: htmlContent,
      ...(attachments.length > 0 && { attachments }),
    })
      .then(() => {
        console.log(
          `📨 Email sent to ${email} with ${attachments.length} attachments`
        );
      })
      .catch((error) => {
        console.error("❌ Error sending email in background:", error);
      })
      .finally(() => {
        // 🧹 cleanup temp files
        files?.forEach((file) => {
          fs.unlink(file.path, () => {});
        });
      });
  } catch (error) {
    console.error("❌ Error handling email request:", error);
    res.status(500).json({ message: "Error initiating welcome email" });
  }
};
