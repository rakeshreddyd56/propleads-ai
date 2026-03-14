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

  // Convert BigInt fields to Number for JSON serialization
  const serialized = {
    ...property,
    priceMin: property.priceMin ? Number(property.priceMin) : null,
    priceMax: property.priceMax ? Number(property.priceMax) : null,
    matches: property.matches.map((m) => ({
      ...m,
      lead: m.lead
        ? {
            ...m.lead,
            budgetMin: m.lead.budgetMin ? Number(m.lead.budgetMin) : null,
            budgetMax: m.lead.budgetMax ? Number(m.lead.budgetMax) : null,
          }
        : m.lead,
    })),
  };

  return NextResponse.json(serialized);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Whitelist allowed fields — never pass raw body to Prisma
  const allowedFields = [
    "name", "builderName", "location", "area", "city",
    "priceMin", "priceMax", "amenities", "unitTypes",
    "reraNumber", "possessionDate", "status", "usps",
  ] as const;
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) data[field] = body[field];
  }
  // Convert types for BigInt and DateTime columns
  if ("priceMin" in data) data.priceMin = data.priceMin ? BigInt(data.priceMin as number) : null;
  if ("priceMax" in data) data.priceMax = data.priceMax ? BigInt(data.priceMax as number) : null;
  if ("possessionDate" in data) data.possessionDate = data.possessionDate ? new Date(data.possessionDate as string) : null;

  const property = await db.property.update({
    where: { id, orgId },
    data,
  });

  // Convert BigInt fields to Number for JSON serialization
  const serialized = {
    ...property,
    priceMin: property.priceMin ? Number(property.priceMin) : null,
    priceMax: property.priceMax ? Number(property.priceMax) : null,
  };

  return NextResponse.json(serialized);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.property.delete({ where: { id, orgId } });
  return NextResponse.json({ success: true });
}
