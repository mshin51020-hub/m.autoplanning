import Stripe from "stripe";

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY が設定されていません");
  return new Stripe(key, { apiVersion: "2024-06-20" as any });
}

export const PLAN_KEYS = [
  "premium_monthly",
  "premium_yearly",
  "premium_plus_monthly",
  "premium_plus_yearly",
] as const;

export type PlanKey = (typeof PLAN_KEYS)[number];

function getPriceId(planKey: PlanKey): string {
  const map: Record<PlanKey, string | undefined> = {
    premium_monthly:      process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    premium_yearly:       process.env.STRIPE_PRICE_PREMIUM_YEARLY,
    premium_plus_monthly: process.env.STRIPE_PRICE_PREMIUM_PLUS_MONTHLY,
    premium_plus_yearly:  process.env.STRIPE_PRICE_PREMIUM_PLUS_YEARLY,
  };
  const priceId = map[planKey];
  if (!priceId) throw new Error(`${planKey} の Price ID が設定されていません (STRIPE_PRICE_* 環境変数を確認してください)`);
  return priceId;
}

export function planKeyToType(planKey: PlanKey): "premium" | "premium_plus" {
  return planKey.startsWith("premium_plus") ? "premium_plus" : "premium";
}

export async function createCheckoutSession(opts: {
  planKey: PlanKey;
  userId: number;
  userEmail: string | null | undefined;
  existingCustomerId: string | null | undefined;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  const stripe = getStripeClient();
  const priceId = getPriceId(opts.planKey);
  const planType = planKeyToType(opts.planKey);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    ...(opts.existingCustomerId
      ? { customer: opts.existingCustomerId }
      : { customer_email: opts.userEmail ?? undefined }),
    metadata: { userId: String(opts.userId), planType },
    subscription_data: {
      metadata: { userId: String(opts.userId), planType },
    },
    locale: "ja",
  });

  if (!session.url) throw new Error("Stripe チェックアウト URL が返されませんでした");
  return { url: session.url };
}

export async function retrieveCompletedSession(sessionId: string) {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });
  return session;
}

export async function createPortalSession(opts: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: opts.customerId,
    return_url: opts.returnUrl,
  });
  return { url: session.url };
}

export async function retrieveSubscription(subscriptionId: string) {
  const stripe = getStripeClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}
