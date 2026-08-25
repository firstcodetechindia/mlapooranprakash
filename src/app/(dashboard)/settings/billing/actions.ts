"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireOrganizationAccess } from "@/lib/security/authorize";
import { isStripeConfigured } from "@/lib/billing/stripe";
import {
  createBillingPortalUrl,
  createUpgradeCheckoutUrl,
  mockCancelSubscription,
  mockUpgradeToPro,
} from "@/lib/billing/checkout";

async function currentOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function upgradeToProAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId"));
  const { session, membership } = await requireOrganizationAccess(organizationId, "ADMIN");

  if (isStripeConfigured()) {
    const origin = await currentOrigin();
    const url = await createUpgradeCheckoutUrl({
      organizationId,
      organizationName: membership.organizationName,
      userEmail: session.user.email,
      actorUserId: session.user.id,
      successUrl: `${origin}/settings/billing?checkout=success`,
      cancelUrl: `${origin}/settings/billing?checkout=canceled`,
    });
    if (url) redirect(url);
  }

  await mockUpgradeToPro(organizationId, session.user.id);
  redirect("/settings/billing?checkout=mock-success");
}

export async function manageBillingAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId"));
  await requireOrganizationAccess(organizationId, "ADMIN");

  const origin = await currentOrigin();
  const url = await createBillingPortalUrl(organizationId, `${origin}/settings/billing`);
  if (url) redirect(url);

  redirect("/settings/billing?portal=unavailable");
}

export async function cancelMockSubscriptionAction(formData: FormData) {
  const organizationId = String(formData.get("organizationId"));
  const { session } = await requireOrganizationAccess(organizationId, "ADMIN");

  await mockCancelSubscription(organizationId, session.user.id);
  redirect("/settings/billing?checkout=mock-canceled");
}
