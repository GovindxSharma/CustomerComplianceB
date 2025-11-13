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

    // build attachments list dynamically
    const attachments =
      files?.map((file) => ({
        filename: file.originalname,
        path: file.path,
      })) || [];

    const htmlContent = clientWelcomeEmail(contactPerson, companyName);

    await sendEmail({
      to: email,
      subject: "Welcome to CCS - Contractor Compliance Services",
      html: htmlContent,
      ...(attachments.length > 0 && { attachments }),
    });

    console.log(
      `📨 Email sent to ${email} with ${attachments.length} attachments`
    );

    // cleanup uploaded files (optional)
    attachments.forEach((att) => fs.unlink(att.path, () => {}));

    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({ message: "Error sending welcome email" });
  }
};
