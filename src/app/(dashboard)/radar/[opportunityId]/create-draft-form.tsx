"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkle } from "@phosphor-icons/react";

import { ALL_PLATFORMS, PLATFORM_LABELS } from "@/lib/config/content";
import { ALL_TONES, ALL_LANGUAGES, TONE_LABELS, LANGUAGE_LABELS } from "@/lib/config/politician";
import { generateDraftAction } from "../../drafts/actions";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CreateDraftForm({
  organizationId,
  researchReportId,
  contentOpportunityId,
}: {
  organizationId: string;
  researchReportId: string;
  contentOpportunityId: string;
}) {
  const router = useRouter();
  const [platform, setPlatform] = useState<(typeof ALL_PLATFORMS)[number]>("X");
  const [language, setLanguage] = useState<(typeof ALL_LANGUAGES)[number]>("ENGLISH");
  const [tone, setTone] = useState<(typeof ALL_TONES)[number]>("INFORMATIONAL");
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const draftId = await generateDraftAction(organizationId, {
        researchReportId,
        contentOpportunityId,
        platform,
        language,
        tone,
      });
      toast.success("Draft generated");
      router.push(`/drafts/${draftId}`);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create a draft</CardTitle>
        <CardDescription>
          Generated only from the facts above — nothing else is added.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as typeof platform)}>
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
            <Label>Language</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {LANGUAGE_LABELS[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tone</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_TONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TONE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={pending}>
          <Sparkle weight="fill" className="size-4" />
          {pending ? "Generating…" : "Generate draft"}
        </Button>
      </CardContent>
    </Card>
  );
}
