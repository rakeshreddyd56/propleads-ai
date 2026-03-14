import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const source = await db.scrapingSource.findFirst({ where: { id, orgId } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.scrapingSource.update({
    where: { id, orgId },
    data: {
      ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
      ...(typeof body.keywords === "object" && Array.isArray(body.keywords) && { keywords: body.keywords.map(String) }),
      ...(typeof body.identifier === "string" && body.identifier && { identifier: body.identifier }),
      ...(typeof body.displayName === "string" && body.displayName && { displayName: body.displayName }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const source = await db.scrapingSource.findFirst({ where: { id, orgId } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.scrapingSource.delete({ where: { id, orgId } });
  return NextResponse.json({ ok: true });
}
