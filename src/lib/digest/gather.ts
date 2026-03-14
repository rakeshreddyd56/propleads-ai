import { db } from "@/lib/db";

export interface DigestLeadSummary {
  id: string;
  name: string | null;
  platform: string;
  score: number;
  tier: string;
  preferredArea: string[];
  budget: string | null;
  createdAt: Date;
}

export interface DigestTopMatch {
  leadName: string | null;
  propertyName: string;
  matchScore: number;
  leadId: string;
  propertyId: string;
}

export interface DigestEnrichmentSummary {
  enrichedCount: number;
  totalNewLeads: number;
  topSources: string[];
}

export interface DigestSourcePerformance {
  platform: string;
  leadsFound: number;
  avgScore: number;
}

export interface DigestData {
  orgId: string;
  orgName: string;
  notifyEmail: string;
  period: { from: Date; to: Date };
  leads: {
    hot: DigestLeadSummary[];
    warm: DigestLeadSummary[];
    cold: DigestLeadSummary[];
    total: number;
  };
  topMatches: DigestTopMatch[];
  enrichment: DigestEnrichmentSummary;
  sourcePerformance: DigestSourcePerformance[];
  kpis: {
    totalLeadsAllTime: number;
    hotLeadsAllTime: number;
    conversionRate: number;
  };
}

/**
 * Gathers all digest data for a single organization for the last 24 hours.
 */
export async function gatherDigestData(orgId: string): Promise<DigestData | null> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, notifyEmail: true },
  });
  if (!org || !org.notifyEmail) return null;

  // 1. New leads in last 24h, grouped by tier
  const newLeads = await db.lead.findMany({
    where: { orgId, createdAt: { gte: yesterday } },
    select: {
      id: true,
      name: true,
      platform: true,
      score: true,
      tier: true,
      preferredArea: true,
      budget: true,
      createdAt: true,
    },
    orderBy: { score: "desc" },
  });

  const hot = newLeads.filter((l) => l.tier === "HOT");
  const warm = newLeads.filter((l) => l.tier === "WARM");
  const cold = newLeads.filter((l) => l.tier === "COLD");

  // 2. Top property matches created in last 24h
  const recentMatches = await db.leadPropertyMatch.findMany({
    where: {
      createdAt: { gte: yesterday },
      lead: { orgId },
    },
    orderBy: { matchScore: "desc" },
    take: 5,
    include: {
      lead: { select: { name: true } },
      property: { select: { name: true } },
    },
  });

  const topMatches: DigestTopMatch[] = recentMatches.map((m) => ({
    leadName: m.lead.name,
    propertyName: m.property.name,
    matchScore: m.matchScore,
    leadId: m.leadId,
    propertyId: m.propertyId,
  }));

  // 3. Enrichment summary
  const enrichedCount = await db.lead.count({
    where: { orgId, enrichedAt: { gte: yesterday } },
  });

  const enrichedLeads = await db.lead.findMany({
    where: { orgId, enrichedAt: { gte: yesterday } },
    select: { enrichmentSource: true },
  });
  const enrichmentSources = [
    ...new Set(enrichedLeads.map((l) => l.enrichmentSource).filter(Boolean)),
  ] as string[];

  // 4. Source performance (leads found per platform in last 24h)
  const sourceBreakdown = await db.lead.groupBy({
    by: ["platform"],
    where: { orgId, createdAt: { gte: yesterday } },
    _count: true,
    _avg: { score: true },
  });

  const sourcePerformance: DigestSourcePerformance[] = sourceBreakdown
    .map((s) => ({
      platform: s.platform,
      leadsFound: s._count,
      avgScore: Math.round(s._avg.score ?? 0),
    }))
    .sort((a, b) => b.leadsFound - a.leadsFound);

  // 5. All-time KPIs
  const [totalLeadsAllTime, hotLeadsAllTime, convertedCount] = await Promise.all([
    db.lead.count({ where: { orgId } }),
    db.lead.count({ where: { orgId, tier: "HOT" } }),
    db.lead.count({ where: { orgId, status: "CONVERTED" } }),
  ]);

  return {
    orgId,
    orgName: org.name,
    notifyEmail: org.notifyEmail,
    period: { from: yesterday, to: now },
    leads: {
      hot,
      warm,
      cold,
      total: newLeads.length,
    },
    topMatches,
    enrichment: {
      enrichedCount,
      totalNewLeads: newLeads.length,
      topSources: enrichmentSources,
    },
    sourcePerformance,
    kpis: {
      totalLeadsAllTime,
      hotLeadsAllTime,
      conversionRate:
        totalLeadsAllTime > 0
          ? Math.round((convertedCount / totalLeadsAllTime) * 100)
          : 0,
    },
  };
}

/**
 * Returns all org IDs that have notifyEmail configured.
 */
export async function getDigestEligibleOrgs(): Promise<string[]> {
  const orgs = await db.organization.findMany({
    where: { notifyEmail: { not: null } },
    select: { id: true },
  });
  return orgs.map((o) => o.id);
}
