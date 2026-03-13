import { NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { runScraping } from "@/lib/scraping/engine";

// Vercel Hobby: 60s max. Pro plan: 300s. Enterprise: 900s.
export const maxDuration = 60;

export async function POST() {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await runScraping(orgId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Scraping error:", error);
    return NextResponse.json({ error: error.message ?? "Scraping failed" }, { status: 500 });
  }
}
