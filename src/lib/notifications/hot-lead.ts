import { db } from "@/lib/db";
import { sendSlackNotification } from "./slack";
import { sendEmailNotification } from "./email";
import { hasFeature } from "@/lib/scraping/tiers";
import type { PlanTier } from "@/lib/scraping/tiers";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://propleads-ai.vercel.app";

export async function notifyIfHotLead(
  orgId: string,
  lead: {
    id: string;
    name: string | null;
    platform: string;
    source: string | null;
    originalText: string | null;
    score: number;
    tier: string;
  }
) {
  if (lead.tier !== "HOT") return;

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { planTier: true, slackWebhookUrl: true, notifyEmail: true },
  });
  if (!org) return;

  if (!hasFeature(org.planTier as PlanTier, "notifications")) return;

  const topMatch = await db.leadPropertyMatch.findFirst({
    where: { leadId: lead.id },
    orderBy: { matchScore: "desc" },
    include: { property: { select: { name: true } } },
  });

  const payload = {
    name: lead.name ?? "Unknown",
    platform: lead.platform,
    source: lead.source ?? lead.platform,
    originalText: lead.originalText ?? "",
    score: lead.score,
    tier: lead.tier,
    matchName: topMatch?.property.name,
    matchScore: topMatch?.matchScore,
    leadUrl: `${BASE_URL}/leads/${lead.id}`,
  };

  const promises: Promise<boolean>[] = [];
  if (org.slackWebhookUrl) promises.push(sendSlackNotification(org.slackWebhookUrl, payload));
  if (org.notifyEmail) promises.push(sendEmailNotification(org.notifyEmail, payload));

  if (promises.length > 0) await Promise.allSettled(promises);
}
