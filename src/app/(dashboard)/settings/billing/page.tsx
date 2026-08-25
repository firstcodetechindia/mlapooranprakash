import type { Metadata } from "next";
import { CheckCircle, Sparkle } from "@phosphor-icons/react/ssr";

import { requireActiveMembership } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { isStripeConfigured } from "@/lib/billing/stripe";
import {
  PLAN_LABELS,
  PLAN_LIMITS,
  PLAN_PRICE_LABELS,
  isTrialExpired,
} from "@/lib/billing/plans";
import { hasRoleAtLeast } from "@/lib/security/authorize";
import {
  upgradeToProAction,
  manageBillingAction,
  cancelMockSubscriptionAction,
} from "./actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Billing — Political Social Command Center",
};

function formatDate(date: Date | null) {
  if (!date) return null;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BillingSettingsPage() {
  const { membership } = await requireActiveMembership();

  const [organization, memberCount] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: membership.organizationId } }),
    db.membership.count({ where: { organizationId: membership.organizationId } }),
  ]);

  const canManageBilling = hasRoleAtLeast(membership.role, "ADMIN");
  const limits = PLAN_LIMITS[organization.plan];
  const trialExpired =
    organization.plan === "TRIAL" && isTrialExpired(organization.trialEndsAt);
  const stripeConfigured = isStripeConfigured();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your organization&apos;s plan, usage, and subscription.
        </p>
      </div>

      {!stripeConfigured ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Stripe isn&apos;t connected in this environment. Upgrading here
          simulates a real subscription (plan, limits, and audit trail all
          update normally) so the flow is fully testable — see{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            STRIPE_SECRET_KEY
          </code>{" "}
          in .env.example to connect a real account.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Current plan: {PLAN_LABELS[organization.plan]}
              </CardTitle>
              <CardDescription>{PLAN_PRICE_LABELS[organization.plan]}</CardDescription>
            </div>
            <Badge
              variant={
                organization.subscriptionStatus === "ACTIVE"
                  ? "default"
                  : trialExpired || organization.subscriptionStatus === "PAST_DUE"
                    ? "destructive"
                    : "secondary"
              }
            >
              {trialExpired ? "Trial expired" : organization.subscriptionStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {organization.plan === "TRIAL" && organization.trialEndsAt ? (
            <p className="text-sm text-muted-foreground">
              {trialExpired ? "Trial ended" : "Trial ends"} on{" "}
              {formatDate(organization.trialEndsAt)}.
            </p>
          ) : null}
          {organization.plan === "PRO" && organization.currentPeriodEnd ? (
            <p className="text-sm text-muted-foreground">
              {organization.cancelAtPeriodEnd
                ? "Cancels on "
                : "Renews on "}
              {formatDate(organization.currentPeriodEnd)}.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <UsageStat
              label="Team members"
              used={memberCount}
              limit={limits.maxMembers}
            />
            <UsageStat
              label="Social accounts"
              used={0}
              limit={limits.maxSocialAccounts}
            />
            <UsageStat
              label="AI generations / mo"
              used={0}
              limit={limits.aiGenerationsPerMonth}
            />
          </div>

          {canManageBilling ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {organization.plan !== "PRO" && organization.plan !== "ENTERPRISE" ? (
                <form action={upgradeToProAction}>
                  <input type="hidden" name="organizationId" value={organization.id} />
                  <Button type="submit">
                    <Sparkle weight="fill" className="size-4" />
                    Upgrade to Pro
                  </Button>
                </form>
              ) : null}
              {organization.stripeCustomerId ? (
                <form action={manageBillingAction}>
                  <input type="hidden" name="organizationId" value={organization.id} />
                  <Button type="submit" variant="outline">
                    Manage subscription
                  </Button>
                </form>
              ) : null}
              {!stripeConfigured && organization.plan === "PRO" ? (
                <form action={cancelMockSubscriptionAction}>
                  <input type="hidden" name="organizationId" value={organization.id} />
                  <Button type="submit" variant="ghost">
                    Cancel (mock)
                  </Button>
                </form>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ask an Admin or Super Admin to make changes to billing.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What&apos;s included</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {[
            "Human-approved AI drafting",
            "Fact-check labeling",
            "Role-based team access",
            "Full audit log",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-sm">
              <CheckCircle weight="fill" className="size-4 text-primary" />
              {feature}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function UsageStat({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const isUnlimited = !Number.isFinite(limit);
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">
        {used}
        <span className="text-sm font-normal text-muted-foreground">
          {" "}
          / {isUnlimited ? "Unlimited" : limit}
        </span>
      </p>
    </div>
  );
}
