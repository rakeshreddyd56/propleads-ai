import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  builderName: z.string().optional(),
  reraNumber: z.string().optional(),
  location: z.string(),
  area: z.string(),
  propertyType: z.enum(["APARTMENT", "VILLA", "PLOT", "COMMERCIAL", "PENTHOUSE", "INDEPENDENT_HOUSE"]).default("APARTMENT"),
  unitTypes: z.array(z.object({ type: z.string(), sizeSqft: z.number(), priceINR: z.number() })).default([]),
  amenities: z.array(z.string()).default([]),
  usps: z.array(z.string()).default([]),
  priceMin: z.number().nullable().optional(),
  priceMax: z.number().nullable().optional(),
  possessionDate: z.string().nullable().optional(),
  brochureUrl: z.string().optional(),
  extractedData: z.any().optional(),
  description: z.string().optional(),
});

export async function GET() {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const properties = await db.property.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { matches: true } } },
  });

  return NextResponse.json(properties.map((p) => ({
    ...p,
    priceMin: p.priceMin ? Number(p.priceMin) : null,
    priceMax: p.priceMax ? Number(p.priceMax) : null,
  })));
}

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data = createSchema.parse(body);

  const { priceMin, priceMax, possessionDate, description, ...rest } = data;

  const property = await db.property.create({
    data: {
      orgId,
      ...rest,
      priceMin: priceMin ? BigInt(priceMin) : null,
      priceMax: priceMax ? BigInt(priceMax) : null,
      possessionDate: possessionDate ? new Date(possessionDate) : null,
    },
  });

  // BigInt can't be serialized to JSON — convert to number
  return NextResponse.json({
    ...property,
    priceMin: property.priceMin ? Number(property.priceMin) : null,
    priceMax: property.priceMax ? Number(property.priceMax) : null,
  }, { status: 201 });
}
