import { NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const breakdown = await db.lead.groupBy({
    by: ["platform"],
    where: { orgId },
    _count: true,
    _avg: { score: true },
  });

  return NextResponse.json(
    breakdown.map((b) => ({
      platform: b.platform,
      count: Number(b._count),
      avgScore: Math.round(b._avg.score ?? 0),
    }))
  );
}
