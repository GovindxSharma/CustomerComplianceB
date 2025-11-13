import nodemailer from "nodemailer";
import path from "path";

interface EmailAttachment {
  filename: string;
  path: string;
  cid?: string; // optional — only needed if embedding inline
}

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
}

const createTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT);
  const secure = process.env.EMAIL_SECURE === "true";
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !port || !user || !pass) {
    console.error("❌ Email env variables not set correctly:", {
      host,
      port,
      user,
      pass: pass ? "*****" : undefined,
    });
    throw new Error("Email environment variables are missing!");
  }

  console.log("📧 Creating email transporter:", { host, port, secure });

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
  attachments = [],
}: SendEmailOptions) => {
  try {
    const transporter = createTransporter();

    // normalize attachments (if paths are relative)
    const normalizedAttachments = attachments.map((att) => ({
      ...att,
      path: path.resolve(att.path),
    }));

    const mailOptions = {
      from: `"Customer Compliance Services" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
      ...(normalizedAttachments.length > 0 && {
        attachments: normalizedAttachments,
      }),
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully! Message ID:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Error sending email:", err);
    throw err;
  }
};
