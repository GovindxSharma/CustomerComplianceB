import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
  attachments,
}: SendEmailOptions) => {
  if (!html && !text) {
    throw new Error("Either html or text must be provided");
  }

  const mailOptions: nodemailer.SendMailOptions = {
    from: process.env.SMTP_FROM || `"Contractor Compliance Services" <${process.env.SMTP_USER}>`,
    to,
    subject,
    ...(html ? { html } : { text }),
    ...(attachments && { attachments }),
  };

  return transporter.sendMail(mailOptions);
};
