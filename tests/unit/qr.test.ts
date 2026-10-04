import { describe, expect, it } from "vitest";

import { maskName } from "@/lib/mask";
import { buildQrCode, generateQrToken, verifyQrCode } from "@/server/qr";

const secret = "s".repeat(32);

describe("signed QR codes", () => {
  it("round-trips a valid code", () => {
    const token = generateQrToken();
    expect(verifyQrCode(buildQrCode(token, secret), secret)).toBe(token);
  });

  it("generates unique, non-sequential tokens", () => {
    expect(new Set(Array.from({ length: 200 }, generateQrToken)).size).toBe(200);
  });

  it("rejects a tampered token, tampered signature, wrong secret and junk", () => {
    const token = generateQrToken();
    const code = buildQrCode(token, secret);
    const [t, sig] = code.split(".");
    expect(verifyQrCode(`${t}x.${sig}`, secret)).toBeNull();
    expect(verifyQrCode(`${t}.${sig.slice(0, -1)}A`, secret)).toBeNull();
    expect(verifyQrCode(code, "o".repeat(32))).toBeNull();
    expect(verifyQrCode("QR-AP-VJA-001", secret)).toBeNull();
    expect(verifyQrCode("a.b.c", secret)).toBeNull();
    expect(verifyQrCode("", secret)).toBeNull();
  });
});

describe("maskName", () => {
  it("hides all but the first letter of each word", () => {
    expect(maskName("Rajesh Kumar")).toBe("R***** K****");
  });
});
