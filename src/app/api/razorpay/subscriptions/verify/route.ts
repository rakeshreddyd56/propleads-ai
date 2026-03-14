import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  verifyPaymentSignature,
  fetchSubscription,
} from "@/lib/razorpay";

/**
 * POST /api/razorpay/subscriptions/verify
 *
 * Verify payment after Razorpay Checkout completes.
 *
 * After the customer completes payment via Checkout.js, Razorpay
 * returns three values to your handler callback. Send them here
 * for server-side verification.
 *
 * Request body:
 * {
 *   razorpay_payment_id: "pay_XXXXX",
 *   razorpay_subscription_id: "sub_XXXXX",
 *   razorpay_signature: "hex_signature_string",
 * }
 *
 * This endpoint:
 * 1. Verifies the payment signature using HMAC-SHA256
 * 2. Fetches the subscription from Razorpay to confirm status
 * 3. Updates the organization's plan tier in the database
 */
export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_signature,
  } = body;

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    return NextResponse.json(
      { error: "Missing payment verification parameters" },
      { status: 400 },
    );
  }

  // Step 1: Verify the signature
  const isValid = verifyPaymentSignature({
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_signature,
  });

  if (!isValid) {
    console.error("Payment signature verification failed", {
      orgId,
      razorpay_payment_id,
      razorpay_subscription_id,
    });
    return NextResponse.json(
      { error: "Invalid payment signature" },
      { status: 400 },
    );
  }

  try {
    // Step 2: Fetch the subscription to get plan details
    const subscription = await fetchSubscription(razorpay_subscription_id);

    // Extract tier and billing cycle from subscription notes
    const tier = subscription.notes?.tier as
      | "FREE"
      | "STARTER"
      | "GROWTH"
      | "PRO"
      | undefined;
    const billingCycle = subscription.notes?.billing_cycle as
      | "monthly"
      | "annual"
      | undefined;

    if (!tier || !billingCycle) {
      console.error("Subscription missing tier/billing_cycle notes", {
        subscriptionId: subscription.id,
        notes: subscription.notes,
      });
      return NextResponse.json(
        { error: "Subscription metadata incomplete" },
        { status: 500 },
      );
    }

    // Step 3: Update the organization
    const org = await db.organization.update({
      where: { id: orgId },
      data: {
        planTier: tier,
        planBillingCycle: billingCycle,
        razorpaySubscriptionId: subscription.id,
        razorpayCustomerId: subscription.customer_id,
      },
    });

    return NextResponse.json({
      success: true,
      tier: org.planTier,
      billingCycle: org.planBillingCycle,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.error("Payment verification - DB update failed:", error);
    return NextResponse.json(
      {
        error: "Payment verified but failed to update subscription",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
