"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CalendarBlank,
  CheckCircle,
  CircleNotch,
  Hash,
  MagnifyingGlass,
  PaperPlaneTilt,
  Scissors,
  Warning,
  XCircle,
} from "@phosphor-icons/react";

import {
  DRAFT_STATUS_LABELS,
  FACT_CHECK_STATUS_LABELS,
  PLATFORM_LABELS,
} from "@/lib/config/content";
import { TONE_LABELS, LANGUAGE_LABELS } from "@/lib/config/politician";
import {
  approveDraftAction,
  publishNowAction,
  rejectDraftAction,
  runFactCheckAction,
  saveDraftBodyAction,
  scheduleDraftAction,
  shortenDraftAction,
  suggestHashtagsAction,
  unscheduleDraftAction,
} from "../actions";
import { Input } from "@/components/ui/input";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

const PLATFORM_MAX_CHARS: Record<string, number> = { X: 280, FACEBOOK: 2000, INSTAGRAM: 2200 };

const FACT_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  VERIFIED: "default",
  PARTIALLY_VERIFIED: "secondary",
  UNVERIFIED: "destructive",
  CONFLICTING: "destructive",
};

interface DraftData {
  id: string;
  platform: string;
  format: string;
  language: string;
  tone: string;
  body: string;
  hashtags: string[];
  status: string;
  rejectionReason: string | null;
  scheduledAt: Date | null;
  socialPost: {
    status: string;
    platformUrl: string | null;
    publishedAt: Date | null;
    errorMessage: string | null;
  } | null;
  factChecks: { id: string; claim: string; status: string; explanation: string; source: string | null }[];
  revisions: {
    id: string;
    changeType: string;
    changeSummary: string | null;
    createdAt: Date;
    createdBy: { name: string | null; email: string } | null;
  }[];
  createdBy: { name: string | null; email: string } | null;
  approvedBy: { name: string | null; email: string } | null;
  rejectedBy: { name: string | null; email: string } | null;
  contentOpportunity: { topic: string } | null;
}

export function DraftEditor({
  organizationId,
  draft,
  canEdit,
  canApprove,
}: {
  organizationId: string;
  draft: DraftData;
  canEdit: boolean;
  canApprove: boolean;
}) {
  const [body, setBody] = useState(draft.body);
  const [hashtags, setHashtags] = useState(draft.hashtags);
  const [rejectReason, setRejectReason] = useState("");
  const [savePending, startSave] = useTransition();
  const [shortenPending, startShorten] = useTransition();
  const [hashtagPending, startHashtag] = useTransition();
  const [factCheckPending, startFactCheck] = useTransition();
  const [approvePending, startApprove] = useTransition();
  const [rejectPending, startReject] = useTransition();
  const [publishPending, startPublish] = useTransition();
  const [schedulePending, startSchedule] = useTransition();
  const [unschedulePending, startUnschedule] = useTransition();
  const [scheduleValue, setScheduleValue] = useState("");

  const maxChars = PLATFORM_MAX_CHARS[draft.platform] ?? 2000;
  const dirty = body !== draft.body;
  const isLocked = !["DRAFT", "FACT_CHECK", "NEEDS_REVIEW", "REJECTED"].includes(draft.status);
  const hasUnverified = draft.factChecks.some((f) => f.status !== "VERIFIED" && f.status !== "PARTIALLY_VERIFIED");

  function handleSave() {
    startSave(async () => {
      await saveDraftBodyAction(organizationId, draft.id, body);
      toast.success("Saved and re-checked");
    });
  }

  function handleShorten() {
    startShorten(async () => {
      const shortened = await shortenDraftAction(organizationId, draft.id, body, maxChars);
      setBody(shortened);
      toast.success("Shortened");
    });
  }

  function handleSuggestHashtags() {
    startHashtag(async () => {
      const suggested = await suggestHashtagsAction(organizationId, draft.id, body);
      setHashtags(suggested);
      toast.success("Hashtags updated");
    });
  }

  function handleFactCheck() {
    startFactCheck(async () => {
      await runFactCheckAction(organizationId, draft.id);
      toast.success("Fact check complete");
    });
  }

  function handleApprove() {
    startApprove(async () => {
      await approveDraftAction(organizationId, draft.id);
      toast.success("Approved");
    });
  }

  function handleReject() {
    startReject(async () => {
      await rejectDraftAction(organizationId, draft.id, rejectReason || "No reason given");
      toast.success("Rejected");
    });
  }

  function handlePublishNow() {
    startPublish(async () => {
      const result = await publishNowAction(organizationId, draft.id);
      if (result.ok) {
        toast.success("Published");
      } else {
        toast.error(result.error ?? "Publishing failed.");
      }
    });
  }

  function handleSchedule() {
    if (!scheduleValue) {
      toast.error("Pick a date and time first.");
      return;
    }
    startSchedule(async () => {
      const result = await scheduleDraftAction(organizationId, draft.id, scheduleValue);
      if (result.ok) {
        toast.success("Scheduled");
      } else {
        toast.error(result.error ?? "Scheduling failed.");
      }
    });
  }

  function handleUnschedule() {
    startUnschedule(async () => {
      await unscheduleDraftAction(organizationId, draft.id);
      toast.success("Unscheduled");
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {draft.contentOpportunity?.topic ?? "Draft"}
            </h1>
            <Badge>{DRAFT_STATUS_LABELS[draft.status as keyof typeof DRAFT_STATUS_LABELS] ?? draft.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {PLATFORM_LABELS[draft.platform as keyof typeof PLATFORM_LABELS] ?? draft.platform} · {draft.format} ·{" "}
            {LANGUAGE_LABELS[draft.language as keyof typeof LANGUAGE_LABELS] ?? draft.language} ·{" "}
            {TONE_LABELS[draft.tone as keyof typeof TONE_LABELS] ?? draft.tone}
          </p>
        </div>
        {canApprove && draft.status === "NEEDS_REVIEW" ? (
          <div className="flex shrink-0 gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={rejectPending}>
                  <XCircle className="size-4" />
                  Reject
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reject this draft?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2">
                      <p>Give the editor a reason so they can revise it.</p>
                      <Textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="e.g. Tone is too formal for this platform"
                        rows={3}
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReject}>Reject</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleApprove} disabled={approvePending}>
              <CheckCircle className="size-4" />
              {approvePending ? "Approving…" : "Approve"}
            </Button>
          </div>
        ) : null}
      </div>

      {draft.status === "REJECTED" && draft.rejectionReason ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <Warning className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Rejected{draft.rejectedBy ? ` by ${draft.rejectedBy.name ?? draft.rejectedBy.email}` : ""}</p>
            <p>{draft.rejectionReason}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="space-y-3">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={!canEdit || isLocked}
                rows={10}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs ${body.length > maxChars ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {body.length} / {maxChars} characters
                </span>
                {canEdit && !isLocked ? (
                  <Button size="sm" onClick={handleSave} disabled={!dirty || savePending}>
                    {savePending ? "Saving…" : "Save & re-check"}
                  </Button>
                ) : null}
              </div>
              {hashtags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
                  {hashtags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Fact check</CardTitle>
                {canEdit && !isLocked ? (
                  <Button size="sm" variant="outline" onClick={handleFactCheck} disabled={factCheckPending}>
                    <MagnifyingGlass className="size-3.5" />
                    {factCheckPending ? "Checking…" : "Re-run"}
                  </Button>
                ) : null}
              </div>
              {hasUnverified ? (
                <CardDescription className="flex items-center gap-1.5 text-destructive">
                  <Warning className="size-3.5" />
                  Review required before publishing.
                </CardDescription>
              ) : (
                <CardDescription>
                  {draft.factChecks.length === 0
                    ? "No factual claims detected."
                    : "All claims verified against research."}
                </CardDescription>
              )}
            </CardHeader>
            {draft.factChecks.length > 0 ? (
              <CardContent className="divide-y divide-border">
                {draft.factChecks.map((fc) => (
                  <div key={fc.id} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={FACT_STATUS_VARIANT[fc.status] ?? "outline"}>
                        {FACT_CHECK_STATUS_LABELS[fc.status as keyof typeof FACT_CHECK_STATUS_LABELS] ?? fc.status}
                      </Badge>
                    </div>
                    <p className="text-sm">{fc.claim}</p>
                    <p className="text-xs text-muted-foreground">{fc.explanation}</p>
                  </div>
                ))}
              </CardContent>
            ) : null}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {canApprove && draft.status === "APPROVED" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Publish</CardTitle>
                <CardDescription>Goes out to the connected account.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button onClick={handlePublishNow} disabled={publishPending}>
                  <PaperPlaneTilt className="size-4" />
                  {publishPending ? "Publishing…" : "Publish now"}
                </Button>
                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  <Input
                    type="datetime-local"
                    value={scheduleValue}
                    onChange={(e) => setScheduleValue(e.target.value)}
                  />
                  <Button variant="outline" onClick={handleSchedule} disabled={schedulePending}>
                    <CalendarBlank className="size-4" />
                    {schedulePending ? "Scheduling…" : "Schedule"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {draft.status === "SCHEDULED" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scheduled</CardTitle>
                <CardDescription>
                  {draft.scheduledAt ? new Date(draft.scheduledAt).toLocaleString() : ""}
                </CardDescription>
              </CardHeader>
              {canApprove ? (
                <CardContent className="flex gap-2">
                  <Button size="sm" onClick={handlePublishNow} disabled={publishPending}>
                    Publish now
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleUnschedule} disabled={unschedulePending}>
                    Cancel
                  </Button>
                </CardContent>
              ) : null}
            </Card>
          ) : null}

          {draft.status === "PUBLISHED" && draft.socialPost ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle weight="fill" className="size-4 text-primary" />
                  <CardTitle className="text-base">Published</CardTitle>
                </div>
                <CardDescription>
                  {draft.socialPost.publishedAt
                    ? new Date(draft.socialPost.publishedAt).toLocaleString()
                    : ""}
                </CardDescription>
              </CardHeader>
              {draft.socialPost.platformUrl ? (
                <CardContent>
                  <a
                    href={draft.socialPost.platformUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View live post
                  </a>
                </CardContent>
              ) : null}
            </Card>
          ) : null}

          {draft.status === "FAILED" && draft.socialPost?.errorMessage ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-destructive">
                  <Warning className="size-4" />
                  <CardTitle className="text-base">Publishing failed</CardTitle>
                </div>
                <CardDescription className="text-destructive">
                  {draft.socialPost.errorMessage}
                </CardDescription>
              </CardHeader>
              {canApprove ? (
                <CardContent>
                  <Button size="sm" onClick={handlePublishNow} disabled={publishPending}>
                    Retry
                  </Button>
                </CardContent>
              ) : null}
            </Card>
          ) : null}

          {canEdit && !isLocked ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI assist</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button variant="outline" className="justify-start" onClick={handleShorten} disabled={shortenPending}>
                  {shortenPending ? (
                    <CircleNotch className="size-4 animate-spin" />
                  ) : (
                    <Scissors className="size-4" />
                  )}
                  Shorten to fit
                </Button>
                <Button variant="outline" className="justify-start" onClick={handleSuggestHashtags} disabled={hashtagPending}>
                  {hashtagPending ? (
                    <CircleNotch className="size-4 animate-spin" />
                  ) : (
                    <Hash className="size-4" />
                  )}
                  Suggest hashtags
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">History</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {draft.revisions.map((rev) => (
                <div key={rev.id} className="py-2 text-xs first:pt-0 last:pb-0">
                  <p className="font-medium">{rev.changeSummary ?? rev.changeType}</p>
                  <p className="text-muted-foreground">
                    {rev.createdBy?.name ?? rev.createdBy?.email ?? "AI"} ·{" "}
                    {new Date(rev.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
