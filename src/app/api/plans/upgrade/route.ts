import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tier, billingCycle, slackWebhookUrl, notifyEmail } = await req.json();

  const validTiers = ["FREE", "STARTER", "GROWTH", "PRO"];
  if (tier && !validTiers.includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const updateData: any = {};
  if (tier) updateData.planTier = tier;
  if (billingCycle) updateData.planBillingCycle = billingCycle;
  if (slackWebhookUrl !== undefined) updateData.slackWebhookUrl = slackWebhookUrl || null;
  if (notifyEmail !== undefined) updateData.notifyEmail = notifyEmail || null;

  const org = await db.organization.update({
    where: { id: orgId },
    data: updateData,
  });

  return NextResponse.json({
    tier: org.planTier,
    billingCycle: org.planBillingCycle,
    slackWebhookUrl: org.slackWebhookUrl,
    notifyEmail: org.notifyEmail,
  });
}
