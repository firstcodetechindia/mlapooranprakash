"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { FileText, Trash, VideoCamera } from "@phosphor-icons/react";

import { deleteMediaAction } from "./actions";
import { MEDIA_TYPE_LABELS } from "@/lib/config/media";
import type { MediaType } from "@/lib/config/media";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MediaRow {
  id: string;
  fileName: string;
  mediaType: MediaType;
  fileSize: number;
  tags: string[];
  altText: string | null;
  uploadedBy: { name: string | null; email: string } | null;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaGrid({
  organizationId,
  assets,
  canManage,
}: {
  organizationId: string;
  assets: MediaRow[];
  canManage: boolean;
}) {
  if (assets.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No media yet"
        description="Upload photos or videos from events, projects, or announcements to attach to drafts."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {assets.map((asset) => (
        <MediaCard key={asset.id} organizationId={organizationId} asset={asset} canManage={canManage} />
      ))}
    </div>
  );
}

function MediaCard({
  organizationId,
  asset,
  canManage,
}: {
  organizationId: string;
  asset: MediaRow;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteMediaAction(organizationId, asset.id);
      toast.success("Deleted");
    });
  }

  return (
    <Card className="group relative overflow-hidden p-0">
      <div className="flex aspect-square items-center justify-center bg-muted">
        {asset.mediaType === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element -- served through an authenticated API route, not a static/optimizable asset
          <img
            src={`/api/media/${asset.id}`}
            alt={asset.altText ?? asset.fileName}
            className="size-full object-cover"
          />
        ) : asset.mediaType === "VIDEO" ? (
          <VideoCamera className="size-8 text-muted-foreground" />
        ) : (
          <FileText className="size-8 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-1.5 p-2.5">
        <p className="truncate text-xs font-medium">{asset.fileName}</p>
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="outline" className="text-[10px]">
            {MEDIA_TYPE_LABELS[asset.mediaType]}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{formatSize(asset.fileSize)}</span>
        </div>
        {asset.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {asset.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      {canManage ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-1.5 right-1.5 size-7 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
              disabled={pending}
            >
              <Trash className="size-3.5" />
              <span className="sr-only">Delete</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this file?</AlertDialogTitle>
              <AlertDialogDescription>
                &quot;{asset.fileName}&quot; will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </Card>
  );
}
