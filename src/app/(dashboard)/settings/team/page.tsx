import type { Metadata } from "next";

import { requireActiveMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/config/roles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Team & Roles — Political Social Command Center",
};

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function TeamSettingsPage() {
  const { membership } = await requireActiveMembership();

  const members = await db.membership.findMany({
    where: { organizationId: membership.organizationId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team & roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone with access to {membership.organizationName}, and what
          their role permits.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>{members.length} team member{members.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">
                  {initials(member.user.name, member.user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member.user.name ?? member.user.email}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.user.email}
                </p>
              </div>
              <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What each role can do</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {Object.entries(ROLE_LABELS).map(([role, label]) => (
            <div key={role} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
              <span className="text-sm font-medium">{label}</span>
              <span className="text-sm text-muted-foreground">
                {ROLE_DESCRIPTIONS[role as keyof typeof ROLE_DESCRIPTIONS]}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
