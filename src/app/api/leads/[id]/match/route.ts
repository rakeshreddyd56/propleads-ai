import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { matchLeadToProperties } from "@/lib/ai/property-matcher";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, orgId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const properties = await db.property.findMany({
    where: { orgId, status: "ACTIVE" },
  });

  const matches = await matchLeadToProperties(lead, properties);

  for (const match of matches) {
    await db.leadPropertyMatch.upsert({
      where: { leadId_propertyId: { leadId: id, propertyId: match.propertyId } },
      update: { matchScore: match.score, matchReasons: match.reasons, aiSummary: match.aiSummary },
      create: {
        leadId: id,
        propertyId: match.propertyId,
        matchScore: match.score,
        matchReasons: match.reasons,
        aiSummary: match.aiSummary,
      },
    });
  }

  return NextResponse.json({ matches });
}
