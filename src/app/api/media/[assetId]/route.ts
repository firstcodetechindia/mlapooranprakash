import { NextResponse } from "next/server";

import { db } from "@/lib/db/client";
import { getStorageProvider } from "@/lib/storage";
import {
  requireOrganizationAccess,
  AuthorizationError,
  UnauthenticatedError,
} from "@/lib/security/authorize";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;

  const asset = await db.mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await requireOrganizationAccess(asset.organizationId, "VIEWER");
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const buffer = await getStorageProvider().read(asset.storageKey);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
