import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runScraping } from "@/lib/scraping/engine";

export const maxDuration = 60;

// Called by Vercel Cron (vercel.json) — runs scraping for all active orgs
export async function GET() {
  try {
    const orgs = await db.organization.findMany({
      where: { scrapingSources: { some: { isActive: true } } },
      select: { id: true },
    });

    const results = [];
    for (const org of orgs) {
      const result = await runScraping(org.id);
      results.push({ orgId: org.id, ...result });
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
