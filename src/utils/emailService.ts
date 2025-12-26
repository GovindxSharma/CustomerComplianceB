import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: {
    filename: string;
    content: Buffer;
  }[];
}) => {
  const emailPayload: any = {
    from:
      process.env.RESEND_FROM ??
      "Customer Compliance Services <onboarding@resend.dev>",
    to,
    subject,
  };

  // ✅ ONLY add one content type
  if (html) {
    emailPayload.html = html;
  } else if (text) {
    emailPayload.text = text;
  } else {
    throw new Error("Either html or text must be provided");
  }

  // ✅ Attachments only if present
  if (attachments && attachments.length > 0) {
    emailPayload.attachments = attachments;
  }

  const response = await resend.emails.send(emailPayload);

  return response;
};
