import type { Metadata } from "next";

import { requireActiveMembership } from "@/lib/auth/session";
import { listMedia } from "@/lib/media/service";
import { hasRoleAtLeast } from "@/lib/security/authorize";
import { UploadMediaDialog } from "./upload-dialog";
import { MediaGrid } from "./media-grid";

export const metadata: Metadata = {
  title: "Media Library — Political Social Command Center",
};

export default async function MediaLibraryPage() {
  const { membership } = await requireActiveMembership();
  const assets = await listMedia(membership.organizationId);
  const canUpload = hasRoleAtLeast(membership.role, "EDITOR");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Media library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Photos and videos your team can attach to drafts.
          </p>
        </div>
        {canUpload ? <UploadMediaDialog organizationId={membership.organizationId} /> : null}
      </div>

      <MediaGrid organizationId={membership.organizationId} assets={assets} canManage={canUpload} />
    </div>
  );
}
