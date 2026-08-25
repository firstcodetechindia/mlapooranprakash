import { SubscriptionPlan } from "@/generated/prisma/enums";

export { SubscriptionPlan };

export interface PlanLimits {
  maxMembers: number;
  maxSocialAccounts: number;
  aiGenerationsPerMonth: number;
}

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  TRIAL: "Trial",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

export const PLAN_PRICE_LABELS: Record<SubscriptionPlan, string> = {
  TRIAL: "Free for 14 days",
  PRO: "$99/mo per organization",
  ENTERPRISE: "Custom — contact sales",
};

/// Infinity renders fine in UI ("Unlimited") and compares correctly in
/// limit checks — no special-casing needed at call sites.
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  TRIAL: { maxMembers: 3, maxSocialAccounts: 1, aiGenerationsPerMonth: 20 },
  PRO: { maxMembers: 15, maxSocialAccounts: 5, aiGenerationsPerMonth: 500 },
  ENTERPRISE: {
    maxMembers: Infinity,
    maxSocialAccounts: Infinity,
    aiGenerationsPerMonth: Infinity,
  },
};

export const TRIAL_LENGTH_DAYS = 14;

export function trialEndsAt(from: Date = new Date()): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + TRIAL_LENGTH_DAYS);
  return end;
}

export function isTrialExpired(trialEndsAtDate: Date | null): boolean {
  if (!trialEndsAtDate) return false;
  return trialEndsAtDate.getTime() < Date.now();
}
