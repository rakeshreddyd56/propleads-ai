import { NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { TIER_LEADS_PER_MONTH, TIER_RUNS_PER_DAY, type PlanTier } from "@/lib/scraping/tiers";

export async function GET() {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { planTier: true, runsToday: true, leadsThisMonth: true },
  });
  const tier = (org?.planTier ?? "FREE") as PlanTier;

  const [
    totalLeads,
    leadsThisWeek,
    leadsThisMonth,
    hotLeads,
    warmLeads,
    totalProperties,
    recentLeads,
    sourceBreakdown,
    statusBreakdown,
    contactedCount,
    convertedCount,
    enrichedCount,
    enrichedThisMonth,
    clusterCount,
    scrapingRuns,
    failedRuns,
    tierBreakdown,
  ] = await Promise.all([
    db.lead.count({ where: { orgId } }),
    db.lead.count({ where: { orgId, createdAt: { gte: weekAgo } } }),
    db.lead.count({ where: { orgId, createdAt: { gte: monthStart } } }),
    db.lead.count({ where: { orgId, tier: "HOT" } }),
    db.lead.count({ where: { orgId, tier: "WARM" } }),
    db.property.count({ where: { orgId, status: "ACTIVE" } }),
    db.lead.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, platform: true, tier: true, score: true, createdAt: true, preferredArea: true },
    }),
    db.lead.groupBy({ by: ["platform"], where: { orgId }, _count: true }),
    db.lead.groupBy({ by: ["status"], where: { orgId }, _count: true }),
    db.lead.count({ where: { orgId, status: { in: ["CONTACTED", "ENGAGED", "SITE_VISIT", "NEGOTIATION"] } } }),
    db.lead.count({ where: { orgId, status: "CONVERTED" } }),
    db.lead.count({ where: { orgId, enrichedAt: { not: null } } }),
    db.lead.count({ where: { orgId, enrichedAt: { gte: monthStart } } }),
    db.leadCluster.count({ where: { orgId } }),
    db.scrapingRun.count({ where: { source: { orgId }, startedAt: { gte: monthStart } } }),
    db.scrapingRun.count({ where: { source: { orgId }, status: "FAILED", startedAt: { gte: monthStart } } }),
    db.lead.groupBy({ by: ["tier"], where: { orgId }, _count: true }),
  ]);

  const enrichmentRate = totalLeads > 0 ? Math.round((enrichedCount / totalLeads) * 100) : 0;
  const scrapingSuccessRate = scrapingRuns > 0 ? Math.round(((scrapingRuns - failedRuns) / scrapingRuns) * 100) : 100;

  return NextResponse.json({
    kpis: {
      totalLeads,
      leadsThisWeek,
      leadsThisMonth,
      hotLeads,
      warmLeads,
      totalProperties,
      contactRate: totalLeads > 0 ? Math.round((contactedCount / totalLeads) * 100) : 0,
      conversionRate: totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0,
      enrichedCount,
      enrichedThisMonth,
      enrichmentRate,
      clusterCount,
      scrapingRuns,
      scrapingSuccessRate,
    },
    usage: {
      runsToday: org?.runsToday ?? 0,
      runsLimit: TIER_RUNS_PER_DAY[tier],
      leadsThisMonth,
      leadsLimit: TIER_LEADS_PER_MONTH[tier],
      tier,
    },
    recentLeads,
    sourceBreakdown: sourceBreakdown.map((s) => ({ platform: s.platform, count: s._count })),
    statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count })),
    tierBreakdown: tierBreakdown.map((t) => ({ tier: t.tier, count: t._count })),
  });
}
