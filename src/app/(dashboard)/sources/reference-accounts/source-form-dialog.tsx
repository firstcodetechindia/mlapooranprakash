"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  ALL_CATEGORIES,
  ALL_FREQUENCIES,
  ALL_PLATFORMS,
  CATEGORY_LABELS,
  FREQUENCY_LABELS,
  PLATFORM_LABELS,
} from "@/lib/config/sources";
import type { ReferenceSourceInput } from "@/lib/sources/service";
import { createSourceAction, updateSourceAction } from "./actions";

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

const emptyForm: ReferenceSourceInput = {
  name: "",
  platform: "RSS",
  category: "NEWS",
  handle: undefined,
  url: "",
  priority: 3,
  monitoringFrequency: "DAILY",
};

interface EditableSource extends ReferenceSourceInput {
  id: string;
}

export function SourceFormDialog({
  organizationId,
  source,
  trigger,
}: {
  organizationId: string;
  source?: EditableSource;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ReferenceSourceInput>(source ?? emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (next) {
      // Reset to the latest source/blank state each time the dialog opens,
      // rather than in an effect — this is a response to the user's click,
      // not a sync-with-external-state concern.
      setForm(source ?? emptyForm);
      setFieldErrors({});
    }
    setOpen(next);
  }

  function set<K extends keyof ReferenceSourceInput>(key: K, value: ReferenceSourceInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = source
        ? await updateSourceAction(organizationId, source.id, form)
        : await createSourceAction(organizationId, form);

      if (result.ok) {
        toast.success(source ? "Source updated" : "Source added");
        setOpen(false);
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? "Couldn't save — check the fields.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{source ? "Edit source" : "Add reference source"}</DialogTitle>
          <DialogDescription>
            An approved public source to monitor for content ideas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Municipal Corporation press releases"
            />
            {fieldErrors.name ? (
              <p className="text-xs text-destructive">{fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Platform</Label>
              <Select value={form.platform} onValueChange={(v) => set("platform", v as ReferenceSourceInput["platform"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PLATFORM_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v as ReferenceSourceInput["category"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://example.gov/press-releases/rss.xml"
            />
            {fieldErrors.url ? (
              <p className="text-xs text-destructive">{fieldErrors.url}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                For RSS/Website sources, the feed or page URL. For X/Facebook/
                Instagram, the profile URL (informational only for now).
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Handle (optional)</Label>
            <Input
              value={form.handle ?? ""}
              onChange={(e) => set("handle", e.target.value)}
              placeholder="@handle"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority (1–5)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={form.priority}
                onChange={(e) => set("priority", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Monitoring frequency</Label>
              <Select
                value={form.monitoringFrequency}
                onValueChange={(v) => set("monitoringFrequency", v as ReferenceSourceInput["monitoringFrequency"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {FREQUENCY_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "Saving…" : source ? "Save changes" : "Add source"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
