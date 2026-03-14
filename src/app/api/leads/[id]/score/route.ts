import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { scoreLead } from "@/lib/ai/lead-scorer";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, orgId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const properties = await db.property.findMany({
    where: { orgId, status: "ACTIVE" },
    select: { area: true, priceMin: true, priceMax: true },
  });
  const areas = [...new Set(properties.map((p) => p.area))];

  const allPriceMins = properties.map((p) => p.priceMin).filter((v): v is bigint => v != null);
  const allPriceMaxs = properties.map((p) => p.priceMax).filter((v): v is bigint => v != null);
  const priceRange = {
    min: allPriceMins.length > 0 ? Number(allPriceMins.reduce((a, b) => a < b ? a : b)) / 100000 : null,
    max: allPriceMaxs.length > 0 ? Number(allPriceMaxs.reduce((a, b) => a > b ? a : b)) / 100000 : null,
  };

  const result = await scoreLead({
    originalText: lead.originalText,
    budget: lead.budget,
    preferredArea: lead.preferredArea,
    timeline: lead.timeline,
    platform: lead.platform,
    buyerPersona: lead.buyerPersona,
  }, areas, priceRange);

  await db.lead.update({
    where: { id, orgId },
    data: {
      score: result.total,
      scoreBreakdown: result.breakdown as any,
      tier: result.tier,
    },
  });

  return NextResponse.json(result);
}
