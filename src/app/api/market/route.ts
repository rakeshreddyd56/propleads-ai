import { NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { HYDERABAD_AREAS, BUYER_PERSONAS } from "@/lib/utils/constants";
import { db } from "@/lib/db";

export async function GET() {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // preferredArea is a String[] array field — groupBy crashes on array columns.
    // Fetch leads and aggregate in JS instead.
    const leads = await db.lead.findMany({
      where: { orgId },
      select: { preferredArea: true },
    });

    const areaCounts: Record<string, number> = {};
    for (const lead of leads) {
      // Guard against null/undefined preferredArea data
      if (!Array.isArray(lead.preferredArea)) continue;
      for (const area of lead.preferredArea) {
        if (typeof area !== "string" || !area) continue;
        areaCounts[area] = (areaCounts[area] ?? 0) + 1;
      }
    }

    const leadsByArea = Object.entries(areaCounts).map(([area, count]) => ({
      preferredArea: area,
      _count: count,
    }));

    return NextResponse.json({
      areas: HYDERABAD_AREAS ?? [],
      personas: BUYER_PERSONAS ?? {},
      leadsByArea,
    });
  } catch (error: any) {
    console.error("Market API error:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
