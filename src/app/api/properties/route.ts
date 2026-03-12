import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  builderName: z.string().nullable().optional(),
  reraNumber: z.string().nullable().optional(),
  location: z.string(),
  area: z.string(),
  propertyType: z.enum(["APARTMENT", "VILLA", "PLOT", "COMMERCIAL", "PENTHOUSE", "INDEPENDENT_HOUSE"]).default("APARTMENT"),
  unitTypes: z.array(z.object({ type: z.string(), sizeSqft: z.number(), priceINR: z.number() })).default([]),
  amenities: z.array(z.string()).default([]),
  usps: z.array(z.string()).default([]),
  priceMin: z.number().nullable().optional(),
  priceMax: z.number().nullable().optional(),
  possessionDate: z.string().nullable().optional(),
  brochureUrl: z.string().nullable().optional(),
  extractedData: z.any().optional(),
  description: z.string().nullable().optional(),
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

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const property = await db.property.create({
      data: {
        orgId,
        name: data.name,
        builderName: data.builderName ?? null,
        reraNumber: data.reraNumber ?? null,
        location: data.location,
        area: data.area,
        propertyType: data.propertyType,
        unitTypes: data.unitTypes,
        amenities: data.amenities,
        usps: data.usps,
        priceMin: data.priceMin ? BigInt(data.priceMin) : null,
        priceMax: data.priceMax ? BigInt(data.priceMax) : null,
        possessionDate: data.possessionDate ? new Date(data.possessionDate) : null,
        brochureUrl: data.brochureUrl ?? null,
        extractedData: data.extractedData ?? null,
      },
    });

    return NextResponse.json({
      ...property,
      priceMin: property.priceMin ? Number(property.priceMin) : null,
      priceMax: property.priceMax ? Number(property.priceMax) : null,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Property creation error:", error);
    return NextResponse.json({ error: error.message ?? "Failed to create property" }, { status: 500 });
  }
}
