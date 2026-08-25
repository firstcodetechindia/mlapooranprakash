import { NextResponse } from "next/server";
import { z } from "zod";

import {
  requireOrganizationAccess,
  AuthorizationError,
  UnauthenticatedError,
} from "@/lib/security/authorize";
import {
  ACCEPTED_MIME_TYPES,
  ALL_SOURCE_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/config/knowledge";
import { ingestKnowledgeDocument } from "@/lib/knowledge/service";

const metaSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  sourceType: z.enum(ALL_SOURCE_TYPES as [string, ...string[]]),
});

export async function POST(request: Request) {
  const formData = await request.formData();

  const parsed = metaSchema.safeParse({
    organizationId: formData.get("organizationId"),
    title: formData.get("title"),
    sourceType: formData.get("sourceType"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Accepted: PDF, DOCX, TXT, CSV." },
      { status: 400 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.` },
      { status: 400 },
    );
  }

  try {
    const { session } = await requireOrganizationAccess(parsed.data.organizationId, "EDITOR");

    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await ingestKnowledgeDocument({
      organizationId: parsed.data.organizationId,
      actorUserId: session.user.id,
      title: parsed.data.title,
      sourceType: parsed.data.sourceType as (typeof ALL_SOURCE_TYPES)[number],
      fileName: file.name,
      mimeType: file.type,
      buffer,
    });

    return NextResponse.json({ document });
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
