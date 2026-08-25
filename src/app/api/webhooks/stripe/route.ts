import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { db } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";
import { getStripeClient } from "@/lib/billing/stripe";

/// Stripe's subscription.status values, narrowed to what we actually
/// branch on. Anything else (e.g. "unpaid") falls back to PAST_DUE.
function mapStripeStatus(status: Stripe.Subscription.Status): "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "canceled":
      return "CANCELED";
    case "incomplete":
    case "incomplete_expired":
      return "INCOMPLETE";
    default:
      return "PAST_DUE";
  }
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organizationId;
  if (!organizationId) return;

  const item = subscription.items.data[0];
  const status = mapStripeStatus(subscription.status);

  await db.organization.update({
    where: { id: organizationId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: item?.price.id,
      subscriptionStatus: status,
      plan: status === "CANCELED" ? "TRIAL" : "PRO",
      currentPeriodEnd: item?.current_period_end
        ? new Date(item.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  await recordAuditLog({
    organizationId,
    action: "billing.subscription_synced",
    resourceType: "Organization",
    resourceId: organizationId,
    newState: { status, subscriptionId: subscription.id },
  });
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.subscription && typeof session.subscription === "string") {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await syncSubscription(subscription);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      await syncSubscription(event.data.object);
      break;
    }
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
