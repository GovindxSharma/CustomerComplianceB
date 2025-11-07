import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (options: EmailOptions) => {
  const { to, subject, html, text } = options;
  return transporter.sendMail({
    from: process.env.SMTP_FROM || `"CCS App" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
};
