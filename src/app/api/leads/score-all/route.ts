import { NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { scoreAllLeads } from "@/lib/scraping/engine";

export const maxDuration = 60;

export async function POST() {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await scoreAllLeads(orgId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Score-all error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
