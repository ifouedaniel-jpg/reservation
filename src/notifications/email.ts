import { Resend } from 'resend';
import type { ReactElement } from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: ReactElement;
}) {
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  return resend.emails.send({ from, to, subject, react });
}
