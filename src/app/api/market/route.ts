import { NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { HYDERABAD_AREAS, BUYER_PERSONAS } from "@/lib/utils/constants";
import { db } from "@/lib/db";

export async function GET() {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leadsByArea = await db.lead.groupBy({
    by: ["preferredArea"],
    where: { orgId },
    _count: true,
  });

  return NextResponse.json({
    areas: HYDERABAD_AREAS,
    personas: BUYER_PERSONAS,
    leadsByArea,
  });
}
