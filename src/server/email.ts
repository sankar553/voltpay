import "server-only";

import { env } from "@/lib/env";

export type EmailResult =
  | { status: "sent" }
  /** Development without an API key: the email was printed to the server console. */
  | { status: "logged" }
  /** Production without an API key: nothing was sent. */
  | { status: "skipped" }
  | { status: "failed"; error: string };

/** Send an email through Resend's HTTP API (no SDK needed). */
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailResult> {
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === "production") return { status: "skipped" };
    console.log(`\n[email:dev] to=${input.to}\nsubject: ${input.subject}\n${input.text}\n`);
    return { status: "logged" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { status: "failed", error: `Resend ${res.status}` };
    return { status: "sent" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : "network error" };
  }
}
