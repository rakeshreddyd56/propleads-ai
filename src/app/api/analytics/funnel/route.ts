import { NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stages = ["NEW", "CONTACTED", "ENGAGED", "SITE_VISIT", "NEGOTIATION", "CONVERTED", "LOST", "NURTURE"];

  const counts = await db.lead.groupBy({
    by: ["status"],
    where: { orgId },
    _count: true,
  });

  const funnel = stages.map((stage) => ({
    stage,
    count: Number(counts.find((c) => c.status === stage)?._count ?? 0),
  }));

  return NextResponse.json(funnel);
}
