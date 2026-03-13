import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { runSingleSource } from "@/lib/scraping/engine";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sourceId } = await req.json();
  if (!sourceId) return NextResponse.json({ error: "sourceId required" }, { status: 400 });

  try {
    const result = await runSingleSource(orgId, sourceId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`Scraping source ${sourceId} error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
