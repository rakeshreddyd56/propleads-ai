import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stages = ["NEW", "CONTACTED", "ENGAGED", "SITE_VISIT", "NEGOTIATION", "CONVERTED", "LOST"];

  const counts = await db.lead.groupBy({
    by: ["status"],
    where: { orgId },
    _count: true,
  });

  const funnel = stages.map((stage) => ({
    stage,
    count: counts.find((c) => c.status === stage)?._count ?? 0,
  }));

  return NextResponse.json(funnel);
}
