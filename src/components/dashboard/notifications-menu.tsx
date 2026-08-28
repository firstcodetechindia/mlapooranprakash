import Link from "next/link";
import { Bell, CheckCircle, Warning, PaperPlaneTilt, XCircle } from "@phosphor-icons/react/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

import type { NotificationType } from "@/generated/prisma/enums";
import { markAllReadAction } from "@/lib/notifications/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TYPE_ICONS: Record<NotificationType, PhosphorIcon> = {
  DRAFT_NEEDS_REVIEW: Warning,
  DRAFT_APPROVED: CheckCircle,
  DRAFT_REJECTED: XCircle,
  DRAFT_PUBLISHED: PaperPlaneTilt,
  DRAFT_PUBLISH_FAILED: XCircle,
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationsMenu({
  notifications,
  unreadCount,
}: {
  notifications: Array<{
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    link: string | null;
    readAt: Date | null;
    createdAt: Date;
  }>;
  unreadCount: number;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
            >
              {unreadCount}
            </Badge>
          ) : null}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 font-normal text-sm">Notifications</DropdownMenuLabel>
          {unreadCount > 0 ? (
            <form action={markAllReadAction}>
              <button type="submit" className="text-xs text-primary hover:underline">
                Mark all as read
              </button>
            </form>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">No notifications yet</p>
        ) : (
          <div className="flex max-h-96 flex-col overflow-y-auto">
            {notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type];
              const unread = !n.readAt;
              const content = (
                <div className="flex w-full items-start gap-2.5 px-2 py-2">
                  <span
                    className={
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full " +
                      (unread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")
                    }
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={"text-sm " + (unread ? "font-medium" : "text-foreground/80")}>{n.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-0.5 text-[0.65rem] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                  </div>
                  {unread ? <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                </div>
              );
              return (
                <DropdownMenuItem key={n.id} asChild className="p-0">
                  {n.link ? (
                    <Link href={n.link} className="cursor-pointer">
                      {content}
                    </Link>
                  ) : (
                    <div>{content}</div>
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
