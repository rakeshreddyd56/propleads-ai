import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { createRunGroup, incrementOrgRunCount } from "@/lib/scraping/run-group";
import { isPlatformAllowed, canRunToday, type PlanTier } from "@/lib/scraping/tiers";

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { planTier: true, runsToday: true, runsResetAt: true },
  });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const tier = org.planTier as PlanTier;

  // Check daily run limit
  const now = new Date();
  const isNewDay = !org.runsResetAt || org.runsResetAt.toDateString() !== now.toDateString();
  const currentRuns = isNewDay ? 0 : org.runsToday;

  if (!canRunToday(tier, currentRuns)) {
    return NextResponse.json({
      error: `Daily run limit reached (${currentRuns} runs today). Upgrade your plan for more.`,
    }, { status: 429 });
  }

  // Get eligible sources
  const allSources = await db.scrapingSource.findMany({
    where: { orgId, isActive: true },
  });

  const eligible = allSources.filter((s) => isPlatformAllowed(tier, s.platform));
  const locked = allSources.filter((s) => !isPlatformAllowed(tier, s.platform));

  if (eligible.length === 0) {
    return NextResponse.json({ error: "No eligible sources for your plan" }, { status: 400 });
  }

  const runGroup = await createRunGroup(orgId, tier, eligible.length);
  await incrementOrgRunCount(orgId);

  return NextResponse.json({
    runGroupId: runGroup.id,
    tier,
    eligible: eligible.map((s) => ({ id: s.id, platform: s.platform, displayName: s.displayName })),
    locked: locked.map((s) => ({ id: s.id, platform: s.platform, displayName: s.displayName })),
  });
}
