/**
 * Razorpay Subscriptions API client for PropLeads billing.
 *
 * Uses Razorpay Subscriptions API for recurring billing.
 * Auth: Basic auth with key_id:key_secret.
 *
 * Flow:
 * 1. Create Razorpay Plans (one-time setup) for each tier + billing cycle
 * 2. Create Subscription when user upgrades → returns short_url for Hosted Checkout
 * 3. Handle webhooks for payment events → auto-upgrade/downgrade org
 */

import { PLAN_PRICING } from "@/lib/scraping/tiers";
import type { PlanTier } from "@/lib/scraping/tiers";
import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
const BASE_URL = "https://api.razorpay.com/v1";

export function isRazorpayConfigured(): boolean {
  return !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

function authHeader(): string {
  return "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
}

async function razorpayFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Razorpay API error: ${data.error?.description ?? JSON.stringify(data)}`);
  }
  return data;
}

// ---- Plan Management ----

export interface RazorpayPlan {
  id: string;
  entity: string;
  interval: number;
  period: "monthly" | "yearly";
  item: { id: string; name: string; amount: number; currency: string };
}

/**
 * Create a Razorpay plan for a specific tier + billing cycle.
 * Amount is in paise (INR * 100).
 */
export async function createPlan(
  tier: PlanTier,
  cycle: "monthly" | "annual"
): Promise<RazorpayPlan> {
  const pricing = PLAN_PRICING[tier];
  const amount = cycle === "annual" ? pricing.annual : pricing.monthly;

  // Razorpay uses "monthly" or "yearly" for period
  const period = cycle === "annual" ? "yearly" : "monthly";

  return razorpayFetch("/plans", {
    method: "POST",
    body: JSON.stringify({
      period,
      interval: 1,
      item: {
        name: `PropLeads ${pricing.name} Plan (${cycle})`,
        amount, // Already in paise from tiers.ts
        currency: "INR",
        description: pricing.tagline,
      },
      notes: { tier, cycle },
    }),
  });
}

/**
 * Get or create all Razorpay plans for our pricing tiers.
 * Returns a map of "TIER_CYCLE" → planId.
 * In production, plan IDs should be stored as env vars after initial creation.
 */
export function getPlanId(tier: PlanTier, cycle: "monthly" | "annual"): string | null {
  // Plan IDs are stored as env vars: RAZORPAY_PLAN_STARTER_MONTHLY, etc.
  const envKey = `RAZORPAY_PLAN_${tier}_${cycle.toUpperCase()}`;
  return process.env[envKey] ?? null;
}

// ---- Customer Management ----

export async function createCustomer(
  name: string,
  email: string,
  contact?: string
): Promise<{ id: string }> {
  return razorpayFetch("/customers", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      contact: contact ?? undefined,
      fail_existing: "0", // Return existing customer if email matches
    }),
  });
}

// ---- Subscription Management ----

export interface RazorpaySubscription {
  id: string;
  plan_id: string;
  status: string;
  short_url: string;
  current_start: number;
  current_end: number;
  customer_id?: string;
}

/**
 * Create a new subscription for an org.
 * Returns the subscription with a short_url for Hosted Checkout page.
 */
export async function createSubscription(
  planId: string,
  customerId?: string,
  totalCount: number = 12,
  notes: Record<string, string> = {}
): Promise<RazorpaySubscription> {
  return razorpayFetch("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      total_count: totalCount,
      customer_id: customerId ?? undefined,
      quantity: 1,
      notes,
      notify_info: {
        notify_phone: null, // Let Razorpay handle notifications
        notify_email: null,
      },
    }),
  });
}

/**
 * Cancel an active subscription.
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtEnd: boolean = true
): Promise<RazorpaySubscription> {
  return razorpayFetch(`/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({
      cancel_at_cycle_end: cancelAtEnd ? 1 : 0,
    }),
  });
}

/**
 * Get subscription details.
 */
export async function getSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
  return razorpayFetch(`/subscriptions/${subscriptionId}`);
}

/**
 * Update a subscription to a different plan (upgrade/downgrade).
 * Creates a new subscription and cancels the old one.
 */
export async function changeSubscriptionPlan(
  oldSubscriptionId: string,
  newPlanId: string,
  customerId?: string,
  notes: Record<string, string> = {}
): Promise<RazorpaySubscription> {
  // Cancel old subscription at end of current cycle
  await cancelSubscription(oldSubscriptionId, true);

  // Create new subscription with new plan
  return createSubscription(newPlanId, customerId, 12, notes);
}

// ---- Webhook Verification ----

/**
 * Verify Razorpay webhook signature.
 * Razorpay signs webhooks with HMAC-SHA256 using the webhook secret.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret?: string
): boolean {
  const webhookSecret = secret ?? process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  if (!webhookSecret) return false;

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Verify payment signature for Checkout callback.
 * Used to verify after customer completes payment on Hosted Page.
 */
export function verifyPaymentSignature(
  subscriptionId: string,
  paymentId: string,
  signature: string
): boolean {
  const generatedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(generatedSignature)
  );
}

// ---- Helper: Map subscription status to plan tier ----

/**
 * Extract tier from subscription notes or plan ID env var mapping.
 */
export function tierFromPlanId(planId: string): PlanTier | null {
  const tiers: PlanTier[] = ["STARTER", "GROWTH", "PRO"];
  for (const tier of tiers) {
    if (getPlanId(tier, "monthly") === planId || getPlanId(tier, "annual") === planId) {
      return tier;
    }
  }
  return null;
}

export function cycleFromPlanId(planId: string): "monthly" | "annual" {
  const tiers: PlanTier[] = ["STARTER", "GROWTH", "PRO"];
  for (const tier of tiers) {
    if (getPlanId(tier, "annual") === planId) return "annual";
  }
  return "monthly";
}
