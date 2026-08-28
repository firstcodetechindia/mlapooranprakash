import { describe, expect, it } from "vitest";

import { matchesClaimedType } from "@/lib/security/file-signature";

describe("matchesClaimedType", () => {
  it("accepts a genuine PNG signature", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0]);
    expect(matchesClaimedType(png, "image/png")).toBe(true);
  });

  it("rejects a plain-text file spoofed as image/png", () => {
    const fakeImage = Buffer.from("<script>alert(1)</script>this is not a png");
    expect(matchesClaimedType(fakeImage, "image/png")).toBe(false);
  });

  it("accepts a genuine PDF signature", () => {
    const pdf = Buffer.from("%PDF-1.4\n%rest of file");
    expect(matchesClaimedType(pdf, "application/pdf")).toBe(true);
  });

  it("rejects a non-PDF file spoofed as application/pdf", () => {
    const notPdf = Buffer.from("just some text, not a pdf");
    expect(matchesClaimedType(notPdf, "application/pdf")).toBe(false);
  });

  it("accepts a genuine WebP signature (RIFF....WEBP)", () => {
    const webp = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("WEBP"),
    ]);
    expect(matchesClaimedType(webp, "image/webp")).toBe(true);
  });

  it("passes through types with no known signature (text/plain, text/csv) unchecked", () => {
    const anything = Buffer.from("hello world");
    expect(matchesClaimedType(anything, "text/plain")).toBe(true);
    expect(matchesClaimedType(anything, "text/csv")).toBe(true);
  });
});
