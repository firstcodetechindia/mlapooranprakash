import type { Metadata } from "next";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CaretLeft, CaretRight, CalendarBlank } from "@phosphor-icons/react/ssr";

import { requireActiveMembership } from "@/lib/auth/session";
import { listCalendarDrafts } from "@/lib/drafts/service";
import { PLATFORM_LABELS } from "@/lib/config/content";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = {
  title: "Calendar — Political Social Command Center",
};

const MONTH_PARAM_FORMAT = "yyyy-MM";

function parseMonthParam(month: string | undefined): Date {
  if (!month) return new Date();
  try {
    const parsed = parse(month, MONTH_PARAM_FORMAT, new Date());
    if (Number.isNaN(parsed.getTime())) return new Date();
    return parsed;
  } catch {
    return new Date();
  }
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const { membership } = await requireActiveMembership();

  const anchor = parseMonthParam(month);
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const drafts = await listCalendarDrafts(membership.organizationId, gridStart, gridEnd);

  const draftsByDay = new Map<string, typeof drafts>();
  for (const draft of drafts) {
    const postedAt = draft.status === "PUBLISHED" ? draft.socialPost?.publishedAt : draft.scheduledAt;
    if (!postedAt) continue;
    const key = format(postedAt, "yyyy-MM-dd");
    const existing = draftsByDay.get(key) ?? [];
    existing.push(draft);
    draftsByDay.set(key, existing);
  }

  const prevMonth = format(subMonths(monthStart, 1), MONTH_PARAM_FORMAT);
  const nextMonth = format(addMonths(monthStart, 1), MONTH_PARAM_FORMAT);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scheduled and published posts across every connected platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/calendar?month=${prevMonth}`} aria-label="Previous month">
              <CaretLeft />
            </Link>
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">{format(monthStart, "MMMM yyyy")}</span>
          <Button variant="outline" size="icon" asChild>
            <Link href={`/calendar?month=${nextMonth}`} aria-label="Next month">
              <CaretRight />
            </Link>
          </Button>
        </div>
      </div>

      {drafts.length === 0 ? (
        <EmptyState
          icon={CalendarBlank}
          title="Nothing scheduled this month"
          description="Approve a draft and schedule it to see it appear on the calendar."
        />
      ) : null}

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
          <div key={label} className="bg-muted/60 px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayDrafts = draftsByDay.get(key) ?? [];
          const inMonth = isSameMonth(day, monthStart);
          return (
            <div
              key={key}
              className={
                "flex min-h-28 flex-col gap-1 bg-card px-1.5 py-1.5 " +
                (inMonth ? "" : "bg-muted/30 text-muted-foreground")
              }
            >
              <span
                className={
                  "flex size-5 items-center justify-center rounded-full text-xs " +
                  (isToday(day) ? "bg-primary font-semibold text-primary-foreground" : "")
                }
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-col gap-1">
                {dayDrafts.slice(0, 3).map((draft) => {
                  const postedAt =
                    draft.status === "PUBLISHED" ? draft.socialPost?.publishedAt : draft.scheduledAt;
                  return (
                    <Link
                      key={draft.id}
                      href={`/drafts/${draft.id}`}
                      className="flex flex-col gap-0.5 rounded-md border border-border/60 bg-background px-1.5 py-1 text-xs transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <Badge variant={draft.status === "PUBLISHED" ? "secondary" : "outline"} className="h-4 px-1.5 text-[0.65rem]">
                          {PLATFORM_LABELS[draft.platform]}
                        </Badge>
                        {postedAt ? (
                          <span className="shrink-0 text-[0.65rem] text-muted-foreground">
                            {format(postedAt, "h:mm a")}
                          </span>
                        ) : null}
                      </div>
                      <p className="line-clamp-1 text-[0.7rem] text-foreground/80">{draft.body}</p>
                    </Link>
                  );
                })}
                {dayDrafts.length > 3 ? (
                  <span className="px-1 text-[0.65rem] text-muted-foreground">
                    +{dayDrafts.length - 3} more
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
