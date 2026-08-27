import Link from "next/link";
import { Bell, CheckSquare } from "@phosphor-icons/react/ssr";
import type { Session } from "next-auth";

import type { SessionMembership } from "@/types/next-auth";
import { db } from "@/lib/db/client";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { UserMenu } from "@/components/dashboard/user-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { glassClasses } from "@/lib/glass";
import { cn } from "@/lib/utils";

function formatToday() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function DashboardHeader({
  user,
  membership,
}: {
  user: Session["user"];
  membership: SessionMembership;
}) {
  const pendingCount = await db.draft.count({
    where: { organizationId: membership.organizationId, status: { in: ["FACT_CHECK", "NEEDS_REVIEW"] } },
  });

  return (
    <header
      className={cn(
        glassClasses,
        "sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-x-0 border-t-0 px-4",
      )}
    >
      <MobileNav />
      <div className="flex flex-1 items-center gap-3 overflow-hidden">
        <span className="truncate text-sm font-medium">
          {membership.organizationName}
        </span>
        <span className="hidden truncate text-sm text-muted-foreground sm:inline">
          {formatToday()}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link href="/approvals">
                <CheckSquare className="size-4" />
                {pendingCount > 0 ? (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
                  >
                    {pendingCount}
                  </Badge>
                ) : null}
                <span className="sr-only">Approval queue</span>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {pendingCount > 0
              ? `${pendingCount} draft${pendingCount === 1 ? "" : "s"} awaiting review`
              : "Approval queue — nothing waiting yet"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" disabled>
              <Bell className="size-4" />
              <span className="sr-only">Notifications</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>No notifications yet</TooltipContent>
        </Tooltip>
        <UserMenu
          name={user.name}
          email={user.email}
          image={user.image}
          role={membership.role}
          organizationName={membership.organizationName}
        />
      </div>
    </header>
  );
}
