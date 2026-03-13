import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runSingleSource } from "@/lib/scraping/engine";
import { createRunGroup, completeRunGroup, incrementOrgRunCount } from "@/lib/scraping/run-group";
import { canRunToday, isPlatformAllowed, type PlanTier } from "@/lib/scraping/tiers";

export const maxDuration = 60;

// Called by Vercel Cron (vercel.json) — runs scraping for all active orgs
export async function GET() {
  try {
    const orgs = await db.organization.findMany({
      where: { scrapingSources: { some: { isActive: true } } },
      select: { id: true, planTier: true, runsToday: true },
    });

    const results = [];
    for (const org of orgs) {
      const tier = (org.planTier ?? "FREE") as PlanTier;

      if (!canRunToday(tier, org.runsToday ?? 0)) {
        results.push({ orgId: org.id, skipped: true, reason: "daily limit" });
        continue;
      }

      const sources = await db.scrapingSource.findMany({
        where: { orgId: org.id, isActive: true },
      });
      const eligible = sources.filter((s) => isPlatformAllowed(tier, s.platform));
      if (eligible.length === 0) continue;

      const runGroup = await createRunGroup(org.id, tier, eligible.length);
      await incrementOrgRunCount(org.id);

      let totalLeads = 0;
      for (const source of eligible) {
        const result = await runSingleSource(org.id, source.id, {
          runGroupId: runGroup.id,
          tier,
        });
        totalLeads += result.leadsFound;
      }

      await completeRunGroup(runGroup.id);
      results.push({ orgId: org.id, sourcesRun: eligible.length, totalLeads });
    }

    return NextResponse.json({ orgsProcessed: orgs.length, results });
  } catch (error: any) {
    console.error("Cron scraping error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Keep POST for backwards compatibility
export async function POST() {
  return GET();
}
