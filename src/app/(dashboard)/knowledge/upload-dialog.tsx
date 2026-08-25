"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CircleNotch, UploadSimple } from "@phosphor-icons/react";

import {
  ACCEPTED_FILE_EXTENSIONS,
  ALL_SOURCE_TYPES,
  SOURCE_TYPE_LABELS,
} from "@/lib/config/knowledge";
import type { DocumentSourceType } from "@/lib/config/knowledge";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UploadDialog({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState<DocumentSourceType>("OTHER");
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a file first.");
      return;
    }
    if (!title.trim()) {
      toast.error("Give the document a title.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("organizationId", organizationId);
      formData.append("title", title.trim());
      formData.append("sourceType", sourceType);
      formData.append("file", file);

      const response = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? "Upload failed.");
        return;
      }

      if (result.document.status === "FAILED") {
        toast.error(`Processed with errors: ${result.document.processingError}`);
      } else {
        toast.success("Document uploaded and processed.");
      }

      setOpen(false);
      setTitle("");
      setSourceType("OTHER");
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
          Upload document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload to Knowledge Base</DialogTitle>
          <DialogDescription>
            PDF, DOCX, TXT, or CSV, up to 20MB. The AI content agent reads
            from approved documents here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2026 Constituency Fact Sheet"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Document type</Label>
            <Select value={sourceType} onValueChange={(v) => setSourceType(v as DocumentSourceType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_SOURCE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {SOURCE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>File</Label>
            <Input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_EXTENSIONS} />
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
