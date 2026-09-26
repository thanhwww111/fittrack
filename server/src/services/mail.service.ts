import { env } from "../config/env";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

// Gửi email qua Resend (https://resend.com) nếu có RESEND_API_KEY.
// Chưa cấu hình thì chỉ in ra log để test ở máy dev; production thiếu key thì báo lỗi trong log.
export async function sendMail(message: MailMessage) {
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === "production") {
      console.error("✉️  RESEND_API_KEY is not set, email to %s was not sent", message.to);
    } else if (env.NODE_ENV === "development") {
      console.log("✉️  [dev mail] to=%s subject=%s\n%s", message.to, message.subject, message.text);
    }
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
    }),
  });
  if (!res.ok) {
    console.error("✉️  Resend error %d: %s", res.status, await res.text());
  }
}
