import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isRazorpayConfigured,
  getPlanId,
  createSubscription,
  createCustomer,
  cancelSubscription,
} from "@/lib/billing/razorpay";
import type { PlanTier } from "@/lib/scraping/tiers";

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tier, billingCycle, slackWebhookUrl, notifyEmail } = await req.json();

  const validTiers = ["FREE", "STARTER", "GROWTH", "PRO"];
  if (tier && !validTiers.includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  // If just updating notification settings (no tier change)
  if (!tier) {
    const updateData: any = {};
    if (billingCycle) updateData.planBillingCycle = billingCycle;
    if (slackWebhookUrl !== undefined) updateData.slackWebhookUrl = slackWebhookUrl || null;
    if (notifyEmail !== undefined) updateData.notifyEmail = notifyEmail || null;

    const org = await db.organization.update({ where: { id: orgId }, data: updateData });
    return NextResponse.json({
      tier: org.planTier,
      billingCycle: org.planBillingCycle,
      slackWebhookUrl: org.slackWebhookUrl,
      notifyEmail: org.notifyEmail,
    });
  }

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      name: true, planTier: true, razorpayCustomerId: true,
      razorpaySubscriptionId: true, notifyEmail: true,
    },
  });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const cycle = billingCycle ?? "monthly";

  // Downgrade to FREE — cancel subscription if active
  if (tier === "FREE") {
    if (org.razorpaySubscriptionId && isRazorpayConfigured()) {
      try {
        await cancelSubscription(org.razorpaySubscriptionId, true);
      } catch (e) {
        console.warn("Failed to cancel Razorpay subscription:", e);
      }
    }
    const updated = await db.organization.update({
      where: { id: orgId },
      data: {
        planTier: "FREE",
        planBillingCycle: "monthly",
        razorpaySubscriptionId: null,
        planExpiresAt: null,
      },
    });
    return NextResponse.json({ tier: updated.planTier, billingCycle: updated.planBillingCycle });
  }

  // Paid upgrade — use Razorpay if configured
  if (isRazorpayConfigured()) {
    const planId = getPlanId(tier as PlanTier, cycle);
    if (!planId) {
      // Razorpay plans not created yet — fall back to direct DB update
      console.warn(`No Razorpay plan ID for ${tier}/${cycle}, updating DB directly`);
      const updated = await db.organization.update({
        where: { id: orgId },
        data: { planTier: tier as PlanTier, planBillingCycle: cycle },
      });
      return NextResponse.json({ tier: updated.planTier, billingCycle: updated.planBillingCycle });
    }

    // Create or reuse Razorpay customer
    let customerId = org.razorpayCustomerId;
    if (!customerId) {
      const customer = await createCustomer(
        org.name,
        org.notifyEmail ?? `${orgId}@propleads.ai`
      );
      customerId = customer.id;
      await db.organization.update({
        where: { id: orgId },
        data: { razorpayCustomerId: customerId },
      });
    }

    // Cancel existing subscription if upgrading/changing
    if (org.razorpaySubscriptionId) {
      try {
        await cancelSubscription(org.razorpaySubscriptionId, false);
      } catch (e) {
        console.warn("Failed to cancel old subscription:", e);
      }
    }

    // Create new subscription
    const subscription = await createSubscription(planId, customerId, 12, { orgId });

    await db.organization.update({
      where: { id: orgId },
      data: {
        razorpaySubscriptionId: subscription.id,
        // Don't update planTier yet — wait for webhook confirmation
      },
    });

    return NextResponse.json({
      tier: org.planTier, // Current tier until payment confirmed
      billingCycle: cycle,
      checkoutUrl: subscription.short_url,
      subscriptionId: subscription.id,
    });
  }

  // No Razorpay — direct update (dev/free mode)
  const updated = await db.organization.update({
    where: { id: orgId },
    data: {
      planTier: tier as PlanTier,
      planBillingCycle: cycle,
    },
  });

  return NextResponse.json({
    tier: updated.planTier,
    billingCycle: updated.planBillingCycle,
  });
}
