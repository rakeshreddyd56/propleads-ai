import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createSubscription,
  fetchSubscription,
  getRazorpayPlanId,
  getPublicKey,
  validateConfig,
} from "@/lib/razorpay";
import type { PlanTier } from "@/lib/scraping/tiers";

/**
 * POST /api/razorpay/subscriptions
 *
 * Creates a Razorpay subscription for the current organization.
 *
 * Request body:
 * {
 *   tier: "STARTER" | "GROWTH" | "PRO",
 *   billingCycle: "monthly" | "annual",
 * }
 *
 * Response:
 * {
 *   subscriptionId: "sub_XXXXX",
 *   razorpayKeyId: "rzp_live_XXXXX",  // For Checkout.js
 *   shortUrl: "https://rzp.io/i/XXXXX",  // Payment link
 *   checkoutOptions: { ... },  // Pre-built Checkout.js options
 * }
 *
 * Frontend flow:
 * 1. Call this endpoint to create a subscription
 * 2. Use the returned checkoutOptions with Razorpay Checkout.js
 * 3. On success, Razorpay returns { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
 * 4. Send those to POST /api/razorpay/subscriptions/verify
 */
export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = validateConfig();
  if (!config.valid) {
    return NextResponse.json(
      { error: "Payment system not configured" },
      { status: 500 },
    );
  }

  const body = await req.json();
  const { tier, billingCycle } = body as {
    tier: PlanTier;
    billingCycle: "monthly" | "annual";
  };

  // Validate tier
  const validTiers: PlanTier[] = ["STARTER", "GROWTH", "PRO"];
  if (!validTiers.includes(tier)) {
    return NextResponse.json(
      { error: "Invalid tier. Must be STARTER, GROWTH, or PRO." },
      { status: 400 },
    );
  }

  if (!["monthly", "annual"].includes(billingCycle)) {
    return NextResponse.json(
      { error: "Invalid billing cycle. Must be monthly or annual." },
      { status: 400 },
    );
  }

  try {
    // Get the Razorpay plan ID for the requested tier + cycle
    const planId = getRazorpayPlanId(tier, billingCycle);
    if (!planId) {
      return NextResponse.json(
        { error: "Plan not configured" },
        { status: 500 },
      );
    }

    // Fetch org details for notes
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, slug: true },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Determine total billing cycles
    const totalCount = billingCycle === "monthly" ? 60 : 5;

    // Create subscription on Razorpay
    const subscription = await createSubscription({
      plan_id: planId,
      total_count: totalCount,
      quantity: 1,
      customer_notify: 1,
      notes: {
        org_id: org.id,
        org_name: org.name,
        org_slug: org.slug,
        tier,
        billing_cycle: billingCycle,
      },
    });

    // Store the subscription ID on the organization for tracking
    await db.organization.update({
      where: { id: orgId },
      data: {
        razorpaySubscriptionId: subscription.id,
      },
    });

    // Return checkout options for the frontend
    return NextResponse.json({
      subscriptionId: subscription.id,
      razorpayKeyId: getPublicKey(),
      shortUrl: subscription.short_url,
      // Pre-built options for Checkout.js (frontend just passes these)
      checkoutOptions: {
        key: getPublicKey(),
        subscription_id: subscription.id,
        name: "PropLeads",
        description: `${tier} Plan - ${billingCycle === "annual" ? "Annual" : "Monthly"}`,
        // handler is set on the frontend
        prefill: {
          // Frontend should add email, contact from the user
        },
        notes: {
          org_id: org.id,
          tier,
          billing_cycle: billingCycle,
        },
        theme: {
          color: "#6366f1", // Match your brand
        },
      },
    });
  } catch (error) {
    console.error("Failed to create subscription:", error);
    return NextResponse.json(
      {
        error: "Failed to create subscription",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/razorpay/subscriptions
 *
 * Get the current subscription status for the organization.
 */
export async function GET() {
  const orgId = await resolveOrg();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: {
        planTier: true,
        planBillingCycle: true,
        razorpaySubscriptionId: true,
        razorpayCustomerId: true,
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    let subscriptionStatus = null;

    if (org.razorpaySubscriptionId) {
      try {
        const sub = await fetchSubscription(org.razorpaySubscriptionId);
        subscriptionStatus = {
          id: sub.id,
          status: sub.status,
          planId: sub.plan_id,
          currentStart: sub.current_start,
          currentEnd: sub.current_end,
          paidCount: sub.paid_count,
          totalCount: sub.total_count,
          chargeAt: sub.charge_at,
          shortUrl: sub.short_url,
        };
      } catch {
        // Subscription might not exist anymore
        subscriptionStatus = null;
      }
    }

    return NextResponse.json({
      tier: org.planTier,
      billingCycle: org.planBillingCycle,
      subscription: subscriptionStatus,
    });
  } catch (error) {
    console.error("Failed to fetch subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 },
    );
  }
}
