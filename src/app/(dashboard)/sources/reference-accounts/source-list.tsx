"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowClockwise,
  PencilSimple,
  Plus,
  Trash,
  Warning,
} from "@phosphor-icons/react";

import {
  CATEGORY_LABELS,
  FETCHABLE_PLATFORMS,
  FREQUENCY_LABELS,
  PLATFORM_LABELS,
} from "@/lib/config/sources";
import type {
  MonitoringFrequency,
  SourceCategory,
  SourcePlatform,
} from "@/lib/config/sources";
import {
  deleteSourceAction,
  fetchSourceNowAction,
  toggleSourceAction,
} from "./actions";
import { SourceFormDialog } from "./source-form-dialog";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

interface SourceRow {
  id: string;
  name: string;
  platform: SourcePlatform;
  category: SourceCategory;
  handle: string | null;
  url: string;
  priority: number;
  enabled: boolean;
  monitoringFrequency: MonitoringFrequency;
  lastFetchedAt: Date | null;
  lastFetchStatus: string | null;
  lastFetchError: string | null;
  _count: { referencePosts: number };
}

function timeAgo(date: Date | null) {
  if (!date) return "Never fetched";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function SourceList({
  organizationId,
  sources,
  canManage,
  canFetch,
}: {
  organizationId: string;
  sources: SourceRow[];
  canManage: boolean;
  canFetch: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <div className="flex justify-end">
          <SourceFormDialog
            organizationId={organizationId}
            trigger={
              <Button>
                <Plus className="size-4" />
                Add source
              </Button>
            }
          />
        </div>
      ) : null}

      {sources.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Warning}
              title="No reference sources yet"
              description="Add an RSS feed or public account to start monitoring for content opportunities."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              organizationId={organizationId}
              source={source}
              canManage={canManage}
              canFetch={canFetch}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SourceCard({
  organizationId,
  source,
  canManage,
  canFetch,
}: {
  organizationId: string;
  source: SourceRow;
  canManage: boolean;
  canFetch: boolean;
}) {
  const [fetchPending, startFetch] = useTransition();
  const [togglePending, startToggle] = useTransition();
  const [deletePending, startDelete] = useTransition();

  const isFetchable = FETCHABLE_PLATFORMS.includes(source.platform);

  function handleFetch() {
    startFetch(async () => {
      const result = await fetchSourceNowAction(organizationId, source.id);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleToggle(enabled: boolean) {
    startToggle(async () => {
      await toggleSourceAction(organizationId, source.id, enabled);
    });
  }

  function handleDelete() {
    startDelete(async () => {
      await deleteSourceAction(organizationId, source.id);
      toast.success("Source removed");
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium">{source.name}</p>
              <Badge variant="outline">{PLATFORM_LABELS[source.platform]}</Badge>
              <Badge variant="secondary">{CATEGORY_LABELS[source.category]}</Badge>
              {!source.enabled ? <Badge variant="outline">Disabled</Badge> : null}
            </div>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              {source.url}
            </a>
            <p className="mt-1 text-xs text-muted-foreground">
              Priority {source.priority}/5 · {FREQUENCY_LABELS[source.monitoringFrequency]} ·{" "}
              {source._count.referencePosts} ingested item
              {source._count.referencePosts === 1 ? "" : "s"}
            </p>
          </div>
          {canManage ? (
            <Switch
              checked={source.enabled}
              onCheckedChange={handleToggle}
              disabled={togglePending}
            />
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <div className="text-xs text-muted-foreground">
            {isFetchable ? (
              <>
                {timeAgo(source.lastFetchedAt)}
                {source.lastFetchStatus === "error" ? (
                  <span className="ml-1.5 text-destructive">
                    · {source.lastFetchError ?? "Last fetch failed"}
                  </span>
                ) : null}
              </>
            ) : (
              "Unavailable through current API permissions."
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isFetchable ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetch}
                disabled={fetchPending || !canFetch}
              >
                <ArrowClockwise className={fetchPending ? "size-3.5 animate-spin" : "size-3.5"} />
                Fetch now
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="outline" size="sm" disabled>
                      <ArrowClockwise className="size-3.5" />
                      Fetch now
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Unavailable through current API permissions
                </TooltipContent>
              </Tooltip>
            )}
            {canManage ? (
              <>
                <SourceFormDialog
                  organizationId={organizationId}
                  source={{ ...source, handle: source.handle ?? undefined }}
                  trigger={
                    <Button variant="ghost" size="icon" className="size-8">
                      <PencilSimple className="size-3.5" />
                      <span className="sr-only">Edit</span>
                    </Button>
                  }
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive">
                      <Trash className="size-3.5" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove this source?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This deletes &quot;{source.name}&quot; and its{" "}
                        {source._count.referencePosts} ingested item
                        {source._count.referencePosts === 1 ? "" : "s"}. This
                        can&apos;t be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} disabled={deletePending}>
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
