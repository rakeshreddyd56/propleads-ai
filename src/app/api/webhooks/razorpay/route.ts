import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  verifyWebhookSignature,
  tierFromPlanId,
  cycleFromPlanId,
} from "@/lib/billing/razorpay";

/**
 * POST /api/webhooks/razorpay
 *
 * Handles Razorpay webhook events for subscription lifecycle:
 * - subscription.activated → upgrade org to paid tier
 * - subscription.charged → renew/extend subscription
 * - subscription.cancelled → downgrade to FREE
 * - subscription.pending → mark as pending (payment retry)
 * - payment.failed → log warning
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  // Verify webhook signature
  if (!verifyWebhookSignature(body, signature)) {
    console.warn("[Razorpay Webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  const eventType = event.event as string;
  const payload = event.payload;

  console.log(`[Razorpay Webhook] ${eventType}`);

  try {
    switch (eventType) {
      case "subscription.activated":
      case "subscription.charged": {
        const subscription = payload.subscription?.entity;
        if (!subscription) break;

        const orgId = subscription.notes?.orgId;
        if (!orgId) {
          console.warn("[Razorpay Webhook] No orgId in subscription notes");
          break;
        }

        const tier = tierFromPlanId(subscription.plan_id);
        const cycle = cycleFromPlanId(subscription.plan_id);

        if (tier) {
          await db.organization.update({
            where: { id: orgId },
            data: {
              planTier: tier,
              planBillingCycle: cycle,
              razorpaySubscriptionId: subscription.id,
              razorpayCustomerId: subscription.customer_id ?? undefined,
              planExpiresAt: subscription.current_end
                ? new Date(subscription.current_end * 1000)
                : undefined,
            },
          });
          console.log(`[Razorpay Webhook] Org ${orgId} upgraded to ${tier} (${cycle})`);
        }
        break;
      }

      case "subscription.cancelled":
      case "subscription.completed": {
        const subscription = payload.subscription?.entity;
        if (!subscription) break;

        const orgId = subscription.notes?.orgId;
        if (!orgId) break;

        // Downgrade to FREE
        await db.organization.update({
          where: { id: orgId },
          data: {
            planTier: "FREE",
            planBillingCycle: "monthly",
            razorpaySubscriptionId: null,
            planExpiresAt: null,
          },
        });
        console.log(`[Razorpay Webhook] Org ${orgId} downgraded to FREE (subscription ${eventType})`);
        break;
      }

      case "subscription.pending": {
        const subscription = payload.subscription?.entity;
        console.log(
          `[Razorpay Webhook] Subscription ${subscription?.id} pending — payment retry in progress`
        );
        break;
      }

      case "payment.failed": {
        const payment = payload.payment?.entity;
        console.warn(
          `[Razorpay Webhook] Payment failed: ${payment?.id} — ${payment?.error_description}`
        );
        break;
      }

      default:
        console.log(`[Razorpay Webhook] Unhandled event: ${eventType}`);
    }
  } catch (error: any) {
    console.error(`[Razorpay Webhook] Error handling ${eventType}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
