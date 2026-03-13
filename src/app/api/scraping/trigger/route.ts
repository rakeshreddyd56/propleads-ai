import { NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { runSingleSource } from "@/lib/scraping/engine";
import { createRunGroup, completeRunGroup, incrementOrgRunCount } from "@/lib/scraping/run-group";
import { canRunToday, isPlatformAllowed, type PlanTier } from "@/lib/scraping/tiers";
import { db } from "@/lib/db";

// Vercel Hobby: 60s max
export const maxDuration = 60;

export async function POST() {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { planTier: true, runsToday: true, runsResetAt: true },
    });
    const tier = (org?.planTier ?? "FREE") as PlanTier;

    if (!canRunToday(tier, org?.runsToday ?? 0)) {
      return NextResponse.json({ error: "Daily run limit reached" }, { status: 429 });
    }

    const sources = await db.scrapingSource.findMany({
      where: { orgId, isActive: true },
    });

    const eligible = sources.filter((s) => isPlatformAllowed(tier, s.platform));
    if (eligible.length === 0) {
      return NextResponse.json({ error: "No eligible sources for your plan" }, { status: 400 });
    }

    const runGroup = await createRunGroup(orgId, tier, eligible.length);
    await incrementOrgRunCount(orgId);

    const results = [];
    for (const source of eligible) {
      const result = await runSingleSource(orgId, source.id, {
        runGroupId: runGroup.id,
        tier,
      });
      results.push(result);
    }

    await completeRunGroup(runGroup.id);

    const totalLeads = results.reduce((s, r) => s + r.leadsFound, 0);
    const totalUpdated = results.reduce((s, r) => s + r.leadsUpdated, 0);
    const totalSkipped = results.reduce((s, r) => s + r.skippedDup, 0);

    return NextResponse.json({
      runGroupId: runGroup.id,
      sourcesRun: eligible.length,
      totalLeads,
      totalUpdated,
      totalSkipped,
      results,
    });
  } catch (error: any) {
    console.error("Scraping error:", error);
    return NextResponse.json({ error: error.message ?? "Scraping failed" }, { status: 500 });
  }
}
