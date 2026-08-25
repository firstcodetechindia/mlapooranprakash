import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/// Null when STRIPE_SECRET_KEY isn't configured — callers fall back to the
/// mock upgrade flow (see checkout.ts) rather than throwing, so the app
/// stays fully usable in local/dev environments without a real Stripe
/// account. See MOCK_SOCIAL_APIS for the same pattern applied to social
/// providers.
export function getStripeClient(): Stripe | null {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client = new Stripe(key);
  return client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID_PRO);
}
