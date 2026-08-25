import "server-only";

import { db } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";
import { getStripeClient, isStripeConfigured } from "@/lib/billing/stripe";

interface CheckoutParams {
  organizationId: string;
  organizationName: string;
  userEmail: string;
  actorUserId: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Returns a Stripe Checkout URL when Stripe is configured, or null when it
 * isn't — callers should fall back to mockUpgradeToPro() in the null case
 * so the upgrade flow is always end-to-end testable locally.
 */
export async function createUpgradeCheckoutUrl(
  params: CheckoutParams,
): Promise<string | null> {
  const stripe = getStripeClient();
  if (!stripe || !isStripeConfigured()) return null;

  const organization = await db.organization.findUniqueOrThrow({
    where: { id: params.organizationId },
  });

  let customerId = organization.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: params.organizationName,
      email: params.userEmail,
      metadata: { organizationId: params.organizationId },
    });
    customerId = customer.id;
    await db.organization.update({
      where: { id: params.organizationId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID_PRO, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.organizationId,
    subscription_data: {
      metadata: { organizationId: params.organizationId },
    },
  });

  return session.url;
}

export async function createBillingPortalUrl(
  organizationId: string,
  returnUrl: string,
): Promise<string | null> {
  const stripe = getStripeClient();
  if (!stripe) return null;

  const organization = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
  });
  if (!organization.stripeCustomerId) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: organization.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Dev/local fallback used when Stripe isn't configured — simulates a
 * successful upgrade so the whole billing flow (limits lifting, plan
 * badge, audit trail) is testable without a Stripe account. Mirrors
 * MOCK_SOCIAL_APIS elsewhere in the app. Never used when Stripe is
 * actually configured — real upgrades only happen via the webhook.
 */
export async function mockUpgradeToPro(organizationId: string, actorUserId: string) {
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  await db.organization.update({
    where: { id: organizationId },
    data: {
      plan: "PRO",
      subscriptionStatus: "ACTIVE",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
    },
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "billing.mock_upgrade",
    resourceType: "Organization",
    resourceId: organizationId,
    newState: { plan: "PRO", subscriptionStatus: "ACTIVE" },
    metadata: { mock: true },
  });
}

export async function mockCancelSubscription(organizationId: string, actorUserId: string) {
  await db.organization.update({
    where: { id: organizationId },
    data: {
      plan: "TRIAL",
      subscriptionStatus: "CANCELED",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    },
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: "billing.mock_cancel",
    resourceType: "Organization",
    resourceId: organizationId,
    newState: { plan: "TRIAL", subscriptionStatus: "CANCELED" },
    metadata: { mock: true },
  });
}
