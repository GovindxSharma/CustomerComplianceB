// src/services/email.service.ts
import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

const createTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT);
  const secure = process.env.EMAIL_SECURE === "true";
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  // Basic validation
  if (!host || !port || !user || !pass) {
    console.error("Email env variables not set correctly:", {
      host,
      port,
      user,
      pass: pass ? "*****" : undefined,
    });
    throw new Error("Email environment variables are missing!");
  }

  console.log(
    "Creating email transporter with host:",
    host,
    "port:",
    port,
    "secure:",
    secure
  );

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
}: SendEmailOptions) => {
  try {
    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER, // sender address
      to,
      subject,
      text,
      html,
    });

    console.log("Email sent successfully! Message ID:", info.messageId);
    return info;
  } catch (err) {
    console.error("Error sending email:", err);
    throw err;
  }
};
