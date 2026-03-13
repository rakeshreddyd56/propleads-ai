import { NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  PLAN_PRICING, TIER_PLATFORMS, TIER_RUNS_PER_DAY,
  TIER_LEADS_PER_MONTH, TIER_FEATURES,
} from "@/lib/scraping/tiers";

export async function GET() {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      planTier: true, planBillingCycle: true, runsToday: true,
      slackWebhookUrl: true, notifyEmail: true,
      razorpaySubscriptionId: true, planExpiresAt: true,
      leadsThisMonth: true,
    },
  });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const leadsThisMonth = await db.lead.count({
    where: { orgId, createdAt: { gte: startOfMonth } },
  });

  const plans = Object.entries(PLAN_PRICING).map(([tier, pricing]) => ({
    tier,
    ...pricing,
    platforms: TIER_PLATFORMS[tier as keyof typeof TIER_PLATFORMS],
    runsPerDay: TIER_RUNS_PER_DAY[tier as keyof typeof TIER_RUNS_PER_DAY],
    leadsPerMonth: TIER_LEADS_PER_MONTH[tier as keyof typeof TIER_LEADS_PER_MONTH],
    features: TIER_FEATURES[tier as keyof typeof TIER_FEATURES],
  }));

  return NextResponse.json({
    current: {
      tier: org?.planTier ?? "FREE",
      billingCycle: org?.planBillingCycle ?? "monthly",
      runsToday: org?.runsToday ?? 0,
      leadsThisMonth,
      slackWebhookUrl: org?.slackWebhookUrl ?? null,
      notifyEmail: org?.notifyEmail ?? null,
      hasSubscription: !!org?.razorpaySubscriptionId,
      planExpiresAt: org?.planExpiresAt?.toISOString() ?? null,
    },
    plans,
  });
}
