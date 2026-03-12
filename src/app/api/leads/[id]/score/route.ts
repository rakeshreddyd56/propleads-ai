import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { scoreLead } from "@/lib/ai/lead-scorer";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, orgId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const properties = await db.property.findMany({
    where: { orgId, status: "ACTIVE" },
    select: { area: true },
  });
  const areas = [...new Set(properties.map((p) => p.area))];

  const result = await scoreLead({
    originalText: lead.originalText,
    budget: lead.budget,
    preferredArea: lead.preferredArea,
    timeline: lead.timeline,
    platform: lead.platform,
    buyerPersona: lead.buyerPersona,
  }, areas);

  await db.lead.update({
    where: { id },
    data: {
      score: result.total,
      scoreBreakdown: result.breakdown as any,
      tier: result.tier,
    },
  });

  return NextResponse.json(result);
}
