import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const property = await db.property.findFirst({
    where: { id, orgId },
    include: {
      matches: { include: { lead: true }, orderBy: { matchScore: "desc" } },
    },
  });

  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(property);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const property = await db.property.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(property);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.property.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
