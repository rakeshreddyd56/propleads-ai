import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await db.lead.findFirst({
    where: { id, orgId },
    include: {
      matches: { include: { property: true }, orderBy: { matchScore: "desc" } },
      outreachEvents: { orderBy: { createdAt: "desc" }, take: 20 },
      coachSessions: { orderBy: { createdAt: "desc" }, take: 5 },
      assignedTo: true,
    },
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const lead = await db.lead.update({ where: { id }, data: body });
  return NextResponse.json(lead);
}
