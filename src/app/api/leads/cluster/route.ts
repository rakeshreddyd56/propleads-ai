import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { clusterLead, clusterAllLeads } from "@/lib/clustering";
import { hasFeature, type PlanTier } from "@/lib/scraping/tiers";

export const maxDuration = 60;

/**
 * POST /api/leads/cluster
 * Body: { leadId: string } — cluster a single lead
 * Body: { batch: true } — cluster all unclustered leads
 *
 * Pro tier only (requires cross_platform_dedup feature).
 */
export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { planTier: true },
  });
  const tier = (org?.planTier ?? "FREE") as PlanTier;

  if (!hasFeature(tier, "cross_platform_dedup")) {
    return NextResponse.json(
      { error: "Cross-platform clustering requires Pro plan" },
      { status: 403 }
    );
  }

  const body = await req.json();

  if (body.batch) {
    const result = await clusterAllLeads(orgId);
    return NextResponse.json(result);
  }

  const { leadId } = body;
  if (!leadId) {
    return NextResponse.json({ error: "leadId required" }, { status: 400 });
  }

  const lead = await db.lead.findFirst({ where: { id: leadId, orgId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const clusterId = await clusterLead(leadId);
  if (!clusterId) {
    return NextResponse.json({ clustered: false, message: "No cross-platform match found" });
  }

  const cluster = await db.leadCluster.findUnique({
    where: { id: clusterId },
    include: {
      leads: {
        select: { id: true, name: true, platform: true, score: true },
      },
    },
  });

  return NextResponse.json({ clustered: true, cluster });
}
