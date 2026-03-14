import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrichLead, enrichHotLeads } from "@/lib/enrichment";
import { hasFeature, type PlanTier } from "@/lib/scraping/tiers";

export const maxDuration = 60;

/**
 * POST /api/leads/enrich
 * Body: { leadId: string } — enrich a single lead
 * Body: { batch: true } — enrich all unenriched HOT leads
 *
 * Pro tier only.
 */
export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check Pro tier
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { planTier: true },
  });
  const tier = (org?.planTier ?? "FREE") as PlanTier;

  if (!hasFeature(tier, "contact_enrichment")) {
    return NextResponse.json(
      { error: "Contact enrichment requires Pro plan" },
      { status: 403 }
    );
  }

  const body = await req.json();

  // Batch mode: enrich all HOT leads
  if (body.batch) {
    const result = await enrichHotLeads(orgId);
    return NextResponse.json(result);
  }

  // Single lead mode
  const { leadId } = body;
  if (!leadId || typeof leadId !== "string") {
    return NextResponse.json({ error: "leadId required (string)" }, { status: 400 });
  }

  // Verify lead belongs to org
  const lead = await db.lead.findFirst({ where: { id: leadId, orgId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const result = await enrichLead(leadId);
  return NextResponse.json(result);
}
