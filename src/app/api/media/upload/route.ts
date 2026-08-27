import { NextResponse } from "next/server";
import { z } from "zod";

import {
  requireOrganizationAccess,
  AuthorizationError,
  UnauthenticatedError,
} from "@/lib/security/authorize";
import { ACCEPTED_MEDIA_MIME_TYPES, MAX_MEDIA_UPLOAD_BYTES } from "@/lib/config/media";
import { uploadMedia } from "@/lib/media/service";

const metaSchema = z.object({
  organizationId: z.string().uuid(),
  tags: z.string().optional(),
  altText: z.string().max(300).optional(),
});

export async function POST(request: Request) {
  const formData = await request.formData();

  const parsed = metaSchema.safeParse({
    organizationId: formData.get("organizationId"),
    tags: formData.get("tags") ?? undefined,
    altText: formData.get("altText") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ACCEPTED_MEDIA_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Accepted: JPG, PNG, WebP, GIF, MP4, MOV, WebM." },
      { status: 400 },
    );
  }
  if (file.size > MAX_MEDIA_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum ${MAX_MEDIA_UPLOAD_BYTES / (1024 * 1024)}MB.` },
      { status: 400 },
    );
  }

  try {
    const { session } = await requireOrganizationAccess(parsed.data.organizationId, "EDITOR");

    const buffer = Buffer.from(await file.arrayBuffer());
    const tags = parsed.data.tags
      ? parsed.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const asset = await uploadMedia({
      organizationId: parsed.data.organizationId,
      actorUserId: session.user.id,
      fileName: file.name,
      mimeType: file.type,
      buffer,
      tags,
      altText: parsed.data.altText,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
