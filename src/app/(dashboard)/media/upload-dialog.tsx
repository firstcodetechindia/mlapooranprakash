"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleNotch, UploadSimple } from "@phosphor-icons/react";

import { ACCEPTED_MEDIA_EXTENSIONS } from "@/lib/config/media";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UploadMediaDialog({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState("");
  const [altText, setAltText] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a file first.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("organizationId", organizationId);
      formData.append("tags", tags);
      formData.append("altText", altText);
      formData.append("file", file);

      const response = await fetch("/api/media/upload", { method: "POST", body: formData });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? "Upload failed.");
        return;
      }

      toast.success("Uploaded");
      setOpen(false);
      setTags("");
      setAltText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      toast.error("Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UploadSimple className="size-4" />
          Upload media
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload media</DialogTitle>
          <DialogDescription>
            Photos or short videos your team can attach to drafts. JPG, PNG,
            WebP, GIF, MP4, MOV, WebM — up to 100MB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>File</Label>
            <Input ref={fileInputRef} type="file" accept={ACCEPTED_MEDIA_EXTENSIONS} />
          </div>
          <div className="space-y-1.5">
            <Label>Tags (comma separated)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. field visit, infrastructure"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Alt text</Label>
            <Input
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image for accessibility"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? <CircleNotch className="size-4 animate-spin" /> : null}
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
