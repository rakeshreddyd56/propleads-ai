import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "10");

  const groups = await db.runGroup.findMany({
    where: { orgId },
    orderBy: { startedAt: "desc" },
    take: limit,
    include: {
      runs: {
        include: { source: { select: { platform: true, displayName: true } } },
        orderBy: { startedAt: "asc" },
      },
    },
  });

  return NextResponse.json(groups);
}
