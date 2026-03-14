/**
 * Razorpay API Client
 *
 * Razorpay Subscriptions API Reference:
 * ======================================
 *
 * Base URL: https://api.razorpay.com
 * Auth: Basic Auth (key_id:key_secret)
 *
 * --- PLANS API ---
 *
 * POST   /v1/plans             Create a plan
 * GET    /v1/plans             List all plans
 * GET    /v1/plans/:id         Fetch a plan by ID
 *
 * Plan request body:
 * {
 *   period: "monthly" | "weekly" | "yearly" | "daily",
 *   interval: number,          // e.g., 1 = every 1 month
 *   item: {
 *     name: string,            // Plan display name
 *     amount: number,          // Amount in paise (e.g., 37500 = Rs 375)
 *     currency: "INR",
 *     description?: string,
 *   },
 *   notes?: Record<string, string>,  // up to 15 key-value pairs
 * }
 *
 * Plan response:
 * {
 *   id: "plan_XXXXX",
 *   entity: "plan",
 *   interval: 1,
 *   period: "monthly",
 *   item: { id, active, amount, unit_amount, currency, name, description },
 *   notes: {},
 *   created_at: 1234567890,
 * }
 *
 * --- SUBSCRIPTIONS API ---
 *
 * POST   /v1/subscriptions                     Create a subscription
 * GET    /v1/subscriptions                     List subscriptions
 * GET    /v1/subscriptions/:id                 Fetch a subscription
 * PATCH  /v1/subscriptions/:id                 Update a subscription
 * POST   /v1/subscriptions/:id/cancel          Cancel a subscription
 * POST   /v1/subscriptions/:id/pause           Pause a subscription
 * POST   /v1/subscriptions/:id/resume          Resume a subscription
 * DELETE /v1/subscriptions/:id/offer/:offer_id Remove offer from subscription
 *
 * Subscription create body:
 * {
 *   plan_id: "plan_XXXXX",                     // Required
 *   total_count: number,                       // Required — total billing cycles
 *   quantity: number,                          // Default 1
 *   start_at?: number,                         // Unix timestamp for future start
 *   expire_by?: number,                        // Unix timestamp, link expires after this
 *   customer_notify?: 0 | 1,                   // 1 = Razorpay sends emails
 *   notes?: Record<string, string>,
 *   notify_info?: { notify_phone, notify_email },
 *   offer_id?: string,
 * }
 *
 * Subscription response:
 * {
 *   id: "sub_XXXXX",
 *   entity: "subscription",
 *   plan_id: "plan_XXXXX",
 *   customer_id: "cust_XXXXX",
 *   status: "created" | "authenticated" | "active" | "pending" | "halted" |
 *           "cancelled" | "completed" | "expired" | "paused",
 *   current_start: number | null,
 *   current_end: number | null,
 *   ended_at: number | null,
 *   quantity: 1,
 *   notes: {},
 *   charge_at: number,
 *   start_at: number,
 *   end_at: number | null,
 *   auth_attempts: number,
 *   total_count: number,
 *   paid_count: number,
 *   customer_notify: 1,
 *   created_at: number,
 *   short_url: "https://rzp.io/i/XXXXX",    // Payment link for subscription
 *   has_scheduled_changes: boolean,
 *   change_scheduled_at: number | null,
 *   source: "api",
 *   payment_method: "card" | "emandate" | "upi" | "nach",
 * }
 *
 * Update subscription body (for plan change / upgrade / downgrade):
 * {
 *   plan_id: "plan_NEW_XXXXX",               // New plan to switch to
 *   quantity?: number,
 *   remaining_count?: number,
 *   schedule_change_at?: "now" | "cycle_end", // Default "cycle_end"
 *   offer_id?: string,
 *   customer_notify?: 0 | 1,
 * }
 *
 * Cancel subscription body:
 * {
 *   cancel_at_cycle_end: 0 | 1,              // 1 = cancel at end of billing cycle
 * }
 *
 * --- SUBSCRIPTION STATES ---
 *
 * created       -> Customer clicks checkout, subscription is created
 * authenticated -> Payment method authorized (for cards/emandate)
 * active        -> Payment successful, subscription is running
 * pending       -> Payment retry in progress (3-day retry window)
 * halted        -> All payment retries failed
 * cancelled     -> Cancelled by merchant or customer
 * completed     -> All billing cycles finished (total_count reached)
 * expired       -> Customer didn't authorize before expire_by
 * paused        -> Temporarily paused by merchant
 *
 * --- WEBHOOK EVENTS ---
 *
 * subscription.authenticated  -> Customer authorized payment method
 * subscription.activated      -> First payment successful
 * subscription.charged        -> Recurring payment successful
 * subscription.pending        -> Payment retry in progress
 * subscription.halted         -> All retries failed
 * subscription.cancelled      -> Subscription cancelled
 * subscription.completed      -> All cycles billed
 * subscription.updated        -> Plan changed
 * subscription.paused         -> Subscription paused
 * subscription.resumed        -> Subscription resumed
 *
 * payment.authorized          -> Payment authorized (for capture)
 * payment.captured            -> Payment captured successfully
 * payment.failed              -> Payment failed
 *
 * Webhook payload:
 * {
 *   entity: "event",
 *   account_id: "acc_XXXXX",
 *   event: "subscription.charged",
 *   contains: ["subscription", "payment"],
 *   payload: {
 *     subscription: { entity: { ...subscriptionObject } },
 *     payment: { entity: { ...paymentObject } },
 *   },
 *   created_at: 1234567890,
 * }
 *
 * --- SIGNATURE VERIFICATION ---
 *
 * Webhook signature: HMAC-SHA256 of request body with webhook secret
 *   Header: X-Razorpay-Signature
 *   Verify: hmac_sha256(raw_body, webhook_secret) === signature_header
 *
 * Payment verification (after checkout):
 *   generated_signature = hmac_sha256(
 *     razorpay_payment_id + "|" + razorpay_subscription_id,
 *     key_secret
 *   )
 *   Verify: generated_signature === razorpay_signature
 *
 * --- PRICING (Razorpay charges) ---
 *
 * Domestic cards: 2% per transaction
 * UPI: 2% per transaction (free on transactions < Rs 2000 for some merchants)
 * Net banking: Rs 2-7 per transaction (bank dependent)
 * Wallets: 2% per transaction
 * International cards: 3% per transaction
 * EMI: 2.5-3% per transaction
 * GST: 18% on Razorpay fees
 *
 * Subscription add-on: No extra charge for subscription billing.
 * The above transaction fees apply to each subscription payment.
 *
 * Settlement: T+2 business days (can be T+1 with Razorpay X)
 */

import crypto from "crypto";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID!;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;
const RAZORPAY_BASE_URL = "https://api.razorpay.com/v1";

function getAuthHeader(): string {
  return `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RazorpayPlan {
  id: string;
  entity: "plan";
  interval: number;
  period: "monthly" | "yearly" | "weekly" | "daily";
  item: {
    id: string;
    active: boolean;
    amount: number;
    unit_amount: number;
    currency: string;
    name: string;
    description: string;
  };
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpaySubscription {
  id: string;
  entity: "subscription";
  plan_id: string;
  customer_id: string | null;
  status:
    | "created"
    | "authenticated"
    | "active"
    | "pending"
    | "halted"
    | "cancelled"
    | "completed"
    | "expired"
    | "paused";
  current_start: number | null;
  current_end: number | null;
  ended_at: number | null;
  quantity: number;
  notes: Record<string, string>;
  charge_at: number;
  start_at: number;
  end_at: number | null;
  auth_attempts: number;
  total_count: number;
  paid_count: number;
  customer_notify: 0 | 1;
  created_at: number;
  short_url: string;
  has_scheduled_changes: boolean;
  change_scheduled_at: number | null;
  source: string;
  payment_method: string;
  offer_id: string | null;
  remaining_count: number;
}

export interface RazorpayWebhookEvent {
  entity: "event";
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    subscription?: { entity: RazorpaySubscription };
    payment?: { entity: RazorpayPayment };
  };
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  entity: "payment";
  amount: number;
  currency: string;
  status: "authorized" | "captured" | "failed" | "refunded";
  method: string;
  description: string;
  order_id: string | null;
  email: string;
  contact: string;
  notes: Record<string, string>;
  created_at: number;
  error_code: string | null;
  error_description: string | null;
}

// ---------------------------------------------------------------------------
// Generic API helper
// ---------------------------------------------------------------------------

async function razorpayRequest<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const url = `${RAZORPAY_BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    const errorBody = await res.text();
    throw new RazorpayError(
      `Razorpay API error: ${res.status} ${res.statusText}`,
      res.status,
      errorBody,
    );
  }

  return res.json() as Promise<T>;
}

export class RazorpayError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody: string,
  ) {
    super(message);
    this.name = "RazorpayError";
  }
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

/**
 * Create a Razorpay plan.
 *
 * POST https://api.razorpay.com/v1/plans
 *
 * @example
 * const plan = await createPlan({
 *   period: "monthly",
 *   interval: 1,
 *   item: { name: "Starter Monthly", amount: 37500, currency: "INR", description: "..." },
 *   notes: { tier: "STARTER", billing_cycle: "monthly" },
 * });
 */
export async function createPlan(params: {
  period: "monthly" | "yearly" | "weekly" | "daily";
  interval: number;
  item: {
    name: string;
    amount: number; // in paise
    currency: string;
    description?: string;
  };
  notes?: Record<string, string>;
}): Promise<RazorpayPlan> {
  return razorpayRequest<RazorpayPlan>("POST", "/plans", params);
}

/**
 * Fetch a plan by ID.
 *
 * GET https://api.razorpay.com/v1/plans/:plan_id
 */
export async function fetchPlan(planId: string): Promise<RazorpayPlan> {
  return razorpayRequest<RazorpayPlan>("GET", `/plans/${planId}`);
}

/**
 * List all plans.
 *
 * GET https://api.razorpay.com/v1/plans
 */
export async function listPlans(params?: {
  count?: number;
  skip?: number;
}): Promise<{ entity: string; count: number; items: RazorpayPlan[] }> {
  const query = new URLSearchParams();
  if (params?.count) query.set("count", String(params.count));
  if (params?.skip) query.set("skip", String(params.skip));
  const qs = query.toString() ? `?${query.toString()}` : "";
  return razorpayRequest("GET", `/plans${qs}`);
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

/**
 * Create a subscription.
 *
 * POST https://api.razorpay.com/v1/subscriptions
 *
 * @example
 * const sub = await createSubscription({
 *   plan_id: "plan_XXXXX",
 *   total_count: 12,
 *   quantity: 1,
 *   customer_notify: 1,
 *   notes: { org_id: "org_abc", tier: "STARTER" },
 * });
 * // sub.short_url -> payment link to send to customer
 * // sub.id -> use in Checkout.js as subscription_id
 */
export async function createSubscription(params: {
  plan_id: string;
  total_count: number;
  quantity?: number;
  start_at?: number;
  expire_by?: number;
  customer_notify?: 0 | 1;
  notes?: Record<string, string>;
  notify_info?: {
    notify_phone?: string;
    notify_email?: string;
  };
  offer_id?: string;
}): Promise<RazorpaySubscription> {
  return razorpayRequest<RazorpaySubscription>(
    "POST",
    "/subscriptions",
    params,
  );
}

/**
 * Fetch a subscription by ID.
 *
 * GET https://api.razorpay.com/v1/subscriptions/:sub_id
 */
export async function fetchSubscription(
  subscriptionId: string,
): Promise<RazorpaySubscription> {
  return razorpayRequest<RazorpaySubscription>(
    "GET",
    `/subscriptions/${subscriptionId}`,
  );
}

/**
 * Update a subscription (change plan for upgrade/downgrade).
 *
 * PATCH https://api.razorpay.com/v1/subscriptions/:sub_id
 *
 * schedule_change_at:
 *   - "cycle_end" (default): Change takes effect at end of current billing cycle.
 *   - "now": Change takes effect immediately. Proration is NOT automatic;
 *     Razorpay charges the full new plan amount immediately.
 *
 * For downgrades, always use "cycle_end" so customer gets remaining value.
 * For upgrades, you may use "now" for immediate access.
 */
export async function updateSubscription(
  subscriptionId: string,
  params: {
    plan_id: string;
    quantity?: number;
    remaining_count?: number;
    schedule_change_at?: "now" | "cycle_end";
    offer_id?: string;
    customer_notify?: 0 | 1;
  },
): Promise<RazorpaySubscription> {
  return razorpayRequest<RazorpaySubscription>(
    "PATCH",
    `/subscriptions/${subscriptionId}`,
    params,
  );
}

/**
 * Cancel a subscription.
 *
 * POST https://api.razorpay.com/v1/subscriptions/:sub_id/cancel
 *
 * cancel_at_cycle_end:
 *   - 1: Cancel at end of current billing cycle (recommended for customer-initiated)
 *   - 0: Cancel immediately (refund may be needed)
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtCycleEnd: boolean = true,
): Promise<RazorpaySubscription> {
  return razorpayRequest<RazorpaySubscription>(
    "POST",
    `/subscriptions/${subscriptionId}/cancel`,
    { cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 },
  );
}

/**
 * Pause a subscription.
 *
 * POST https://api.razorpay.com/v1/subscriptions/:sub_id/pause
 *
 * Pauses the subscription. No charges during pause.
 * Only "active" subscriptions can be paused.
 */
export async function pauseSubscription(
  subscriptionId: string,
  params?: { pause_initiated_by?: "customer" | "merchant" },
): Promise<RazorpaySubscription> {
  return razorpayRequest<RazorpaySubscription>(
    "POST",
    `/subscriptions/${subscriptionId}/pause`,
    params ?? {},
  );
}

/**
 * Resume a paused subscription.
 *
 * POST https://api.razorpay.com/v1/subscriptions/:sub_id/resume
 *
 * Resumes a paused subscription. Only "paused" subscriptions can be resumed.
 */
export async function resumeSubscription(
  subscriptionId: string,
  params?: { resume_initiated_by?: "customer" | "merchant" },
): Promise<RazorpaySubscription> {
  return razorpayRequest<RazorpaySubscription>(
    "POST",
    `/subscriptions/${subscriptionId}/resume`,
    params ?? {},
  );
}

// ---------------------------------------------------------------------------
// Signature Verification
// ---------------------------------------------------------------------------

/**
 * Verify Razorpay payment signature after Checkout completion.
 *
 * After checkout, Razorpay returns:
 *   { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
 *
 * Verification:
 *   generated = HMAC-SHA256(razorpay_payment_id + "|" + razorpay_subscription_id, key_secret)
 *   Compare generated with razorpay_signature
 */
export function verifyPaymentSignature(params: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}): boolean {
  const message = `${params.razorpay_payment_id}|${params.razorpay_subscription_id}`;
  const generated = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(message)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(generated),
    Buffer.from(params.razorpay_signature),
  );
}

/**
 * Verify Razorpay webhook signature.
 *
 * Razorpay sends the signature in the X-Razorpay-Signature header.
 * The signature is HMAC-SHA256 of the raw request body using the webhook secret.
 *
 * IMPORTANT: Use the raw request body (not parsed JSON) for verification.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  const generated = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(generated),
      Buffer.from(signature),
    );
  } catch {
    // timingSafeEqual throws if lengths differ
    return false;
  }
}

// ---------------------------------------------------------------------------
// Checkout helpers
// ---------------------------------------------------------------------------

/**
 * Get the public key for frontend Checkout.js initialization.
 */
export function getPublicKey(): string {
  return RAZORPAY_KEY_ID;
}

// ---------------------------------------------------------------------------
// Config validation
// ---------------------------------------------------------------------------

export function validateConfig(): { valid: boolean; missing: string[] } {
  const required = [
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
  ];
  const missing = required.filter((key) => !process.env[key]);
  return { valid: missing.length === 0, missing };
}
