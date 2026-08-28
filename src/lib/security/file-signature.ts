/**
 * Verifies a file's actual bytes match its claimed MIME type, instead of
 * trusting the client-supplied Content-Type on the multipart file part —
 * that header is attacker-controlled (trivial to set via curl/fetch), so
 * the upload routes' MIME whitelist alone doesn't guarantee the stored
 * file is really what it claims to be. Only checked for types with a
 * reliable magic-byte signature; text/plain and text/csv have none; skip
 * them.
 */
export function matchesClaimedType(buffer: Buffer, claimedMimeType: string): boolean {
  const check = SIGNATURE_CHECKS[claimedMimeType];
  if (!check) return true;
  return check(buffer);
}

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, i) => buffer[offset + i] === byte);
}

const SIGNATURE_CHECKS: Record<string, (buffer: Buffer) => boolean> = {
  "image/jpeg": (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  "image/png": (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/gif": (b) => startsWith(b, [0x47, 0x49, 0x46, 0x38]),
  "image/webp": (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8),
  "video/mp4": (b) => startsWith(b, [0x66, 0x74, 0x79, 0x70], 4),
  "video/quicktime": (b) => startsWith(b, [0x66, 0x74, 0x79, 0x70], 4),
  "video/webm": (b) => startsWith(b, [0x1a, 0x45, 0xdf, 0xa3]),
  "application/pdf": (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]),
  // DOCX is a ZIP container — this confirms "it's a valid ZIP", not
  // specifically a Word document, but catches the common case of someone
  // uploading a renamed non-ZIP file (e.g. an HTML or script payload) with
  // a spoofed docx Content-Type.
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (b) =>
    startsWith(b, [0x50, 0x4b, 0x03, 0x04]),
};
