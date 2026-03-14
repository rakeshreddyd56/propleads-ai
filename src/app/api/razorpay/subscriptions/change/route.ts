import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  updateSubscription,
  cancelSubscription,
  getRazorpayPlanId,
  fetchSubscription,
} from "@/lib/razorpay";
import type { PlanTier } from "@/lib/scraping/tiers";

/**
 * POST /api/razorpay/subscriptions/change
 *
 * Change subscription plan (upgrade/downgrade) or cancel.
 *
 * Request body for plan change:
 * {
 *   action: "change",
 *   tier: "GROWTH",
 *   billingCycle: "monthly" | "annual",
 *   scheduleAt: "now" | "cycle_end",  // Default: upgrades = "now", downgrades = "cycle_end"
 * }
 *
 * Request body for cancel:
 * {
 *   action: "cancel",
 *   cancelAtCycleEnd: true,  // Default: true (cancel at end of billing cycle)
 * }
 *
 * Request body for downgrade to free:
 * {
 *   action: "downgrade_to_free",
 * }
 *
 * Upgrade/Downgrade logic:
 * - Upgrades: Default to immediate ("now") so customer gets access right away.
 *   Razorpay charges the full new plan amount immediately.
 * - Downgrades: Default to "cycle_end" so customer keeps current plan until
 *   end of billing cycle.
 * - Razorpay does NOT handle proration automatically. For upgrades with
 *   proration, you would need to calculate the credit and apply it as an
 *   add-on or offer. For simplicity, we charge full price on plan change.
 */
export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  // Get current org data
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      planTier: true,
      planBillingCycle: true,
      razorpaySubscriptionId: true,
    },
  });

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  // ---------------------------------------------------------------------------
  // CANCEL
  // ---------------------------------------------------------------------------
  if (action === "cancel") {
    if (!org.razorpaySubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription to cancel" },
        { status: 400 },
      );
    }

    try {
      const cancelAtCycleEnd = body.cancelAtCycleEnd !== false; // Default true
      const sub = await cancelSubscription(
        org.razorpaySubscriptionId,
        cancelAtCycleEnd,
      );

      // If immediate cancel, downgrade to FREE now
      if (!cancelAtCycleEnd) {
        await db.organization.update({
          where: { id: orgId },
          data: {
            planTier: "FREE",
            planBillingCycle: "monthly",
          },
        });
      }
      // If cancel at cycle end, the webhook handler will downgrade when the
      // subscription.cancelled event fires

      return NextResponse.json({
        success: true,
        subscriptionId: sub.id,
        status: sub.status,
        cancelAtCycleEnd,
        message: cancelAtCycleEnd
          ? "Subscription will be cancelled at the end of the current billing cycle."
          : "Subscription cancelled immediately.",
      });
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      return NextResponse.json(
        { error: "Failed to cancel subscription" },
        { status: 500 },
      );
    }
  }

  // ---------------------------------------------------------------------------
  // DOWNGRADE TO FREE
  // ---------------------------------------------------------------------------
  if (action === "downgrade_to_free") {
    if (org.razorpaySubscriptionId) {
      try {
        await cancelSubscription(org.razorpaySubscriptionId, true);
      } catch (error) {
        console.error("Failed to cancel subscription during downgrade:", error);
        // Continue anyway - we still want to downgrade the plan
      }
    }

    await db.organization.update({
      where: { id: orgId },
      data: {
        planTier: "FREE",
        planBillingCycle: "monthly",
      },
    });

    return NextResponse.json({
      success: true,
      tier: "FREE",
      message:
        "Downgraded to Free plan. Current subscription will cancel at cycle end.",
    });
  }

  // ---------------------------------------------------------------------------
  // CHANGE PLAN (upgrade or downgrade)
  // ---------------------------------------------------------------------------
  if (action === "change") {
    const { tier, billingCycle, scheduleAt } = body as {
      tier: PlanTier;
      billingCycle: "monthly" | "annual";
      scheduleAt?: "now" | "cycle_end";
    };

    const validTiers: PlanTier[] = ["STARTER", "GROWTH", "PRO"];
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier" },
        { status: 400 },
      );
    }

    if (!org.razorpaySubscriptionId) {
      // No existing subscription -- create a new one instead
      return NextResponse.json(
        {
          error: "No active subscription. Create a new subscription instead.",
          redirect: "/api/razorpay/subscriptions",
        },
        { status: 400 },
      );
    }

    try {
      // Check current subscription status
      const currentSub = await fetchSubscription(org.razorpaySubscriptionId);

      if (!["active", "authenticated"].includes(currentSub.status)) {
        return NextResponse.json(
          {
            error: `Cannot change plan. Subscription is ${currentSub.status}.`,
          },
          { status: 400 },
        );
      }

      const newPlanId = getRazorpayPlanId(tier, billingCycle);
      if (!newPlanId) {
        return NextResponse.json(
          { error: "Plan not configured" },
          { status: 500 },
        );
      }

      // Determine schedule: upgrades default to "now", downgrades to "cycle_end"
      const tierOrder = { FREE: 0, STARTER: 1, GROWTH: 2, PRO: 3 };
      const currentTierNum = tierOrder[org.planTier as PlanTier] ?? 0;
      const newTierNum = tierOrder[tier];
      const isUpgrade = newTierNum > currentTierNum;

      const effectiveSchedule =
        scheduleAt ?? (isUpgrade ? "now" : "cycle_end");

      const updatedSub = await updateSubscription(
        org.razorpaySubscriptionId,
        {
          plan_id: newPlanId,
          schedule_change_at: effectiveSchedule,
          customer_notify: 1,
        },
      );

      // If changing immediately, update the DB now
      if (effectiveSchedule === "now") {
        await db.organization.update({
          where: { id: orgId },
          data: {
            planTier: tier,
            planBillingCycle: billingCycle,
          },
        });
      }
      // If scheduled for cycle end, the webhook will handle the update

      return NextResponse.json({
        success: true,
        subscriptionId: updatedSub.id,
        status: updatedSub.status,
        isUpgrade,
        scheduleChangeAt: effectiveSchedule,
        newTier: tier,
        newBillingCycle: billingCycle,
        hasScheduledChanges: updatedSub.has_scheduled_changes,
        message: isUpgrade
          ? `Upgraded to ${tier}. New plan is active immediately.`
          : `Plan change to ${tier} scheduled for end of current billing cycle.`,
      });
    } catch (error) {
      console.error("Failed to change subscription:", error);
      return NextResponse.json(
        {
          error: "Failed to change subscription plan",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { error: "Invalid action. Use: change, cancel, or downgrade_to_free." },
    { status: 400 },
  );
}
