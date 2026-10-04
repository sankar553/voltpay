import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

/**
 * QR design: the sticker encodes  <APP_URL>/m/<token>.<sig>
 *  - token: random 128-bit value (not derived from meter/consumer numbers)
 *  - sig:   truncated HMAC-SHA256(token, QR_SIGNING_SECRET)
 * Forged or edited codes fail verification before any database lookup.
 */
const SIG_LENGTH = 16;

export function generateQrToken(): string {
  return randomBytes(16).toString("base64url");
}

function sign(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("base64url").slice(0, SIG_LENGTH);
}

export function buildQrCode(token: string, secret = env.QR_SIGNING_SECRET): string {
  return `${token}.${sign(token, secret)}`;
}

export function qrUrl(token: string): string {
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/m/${buildQrCode(token)}`;
}

/** Returns the token if the code's signature is valid, otherwise null. */
export function verifyQrCode(code: string, secret = env.QR_SIGNING_SECRET): string | null {
  const [token, sig, ...rest] = code.split(".");
  if (!token || !sig || rest.length > 0) return null;
  const expected = Buffer.from(sign(token, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return token;
}
