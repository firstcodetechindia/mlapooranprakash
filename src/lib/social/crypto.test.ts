import { describe, expect, it } from "vitest";

import { encryptToken, decryptToken } from "@/lib/social/crypto";

describe("encryptToken / decryptToken", () => {
  it("round-trips a token", () => {
    const original = "super-secret-access-token-12345";
    const encrypted = encryptToken(original);
    expect(encrypted).not.toContain(original);
    expect(decryptToken(encrypted)).toBe(original);
  });

  it("produces a different ciphertext each time (random IV) for the same plaintext", () => {
    const a = encryptToken("same-token");
    const b = encryptToken("same-token");
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe("same-token");
    expect(decryptToken(b)).toBe("same-token");
  });

  it("rejects a tampered ciphertext instead of silently returning garbage", () => {
    const encrypted = encryptToken("do-not-tamper");
    const [iv, authTag, body] = encrypted.split(".");
    const tampered = [iv, authTag, body.slice(0, -4) + "AAAA"].join(".");
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("rejects a malformed stored value", () => {
    expect(() => decryptToken("not-a-valid-token")).toThrow("Malformed encrypted token.");
  });
});
