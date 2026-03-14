import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { runSingleSource } from "@/lib/scraping/engine";
import { db } from "@/lib/db";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { sourceId, runGroupId } = body;
  if (!sourceId || typeof sourceId !== "string") {
    return NextResponse.json({ error: "sourceId required" }, { status: 400 });
  }

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { planTier: true },
  });

  const result = await runSingleSource(orgId, sourceId, {
    runGroupId,
    tier: (org?.planTier as any) ?? "FREE",
  });

  return NextResponse.json(result);
}
