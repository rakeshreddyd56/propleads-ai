import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrichPerson } from "@/lib/enrichment/apollo";

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId } = await req.json();
  const lead = await db.lead.findFirst({ where: { id: leadId, orgId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const enriched = await enrichPerson({
    name: lead.name ?? undefined,
    email: lead.email ?? undefined,
  });

  await db.lead.update({
    where: { id: leadId },
    data: { enrichedData: enriched, enrichedAt: new Date() },
  });

  return NextResponse.json(enriched);
}
