import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  builderName: z.string().optional(),
  reraNumber: z.string().optional(),
  location: z.string(),
  area: z.string(),
  propertyType: z.enum(["APARTMENT", "VILLA", "PLOT", "COMMERCIAL", "PENTHOUSE", "INDEPENDENT_HOUSE"]),
  unitTypes: z.array(z.object({ type: z.string(), sizeSqft: z.number(), priceINR: z.number() })),
  amenities: z.array(z.string()).default([]),
  usps: z.array(z.string()).default([]),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  possessionDate: z.string().optional(),
  brochureUrl: z.string().optional(),
  extractedData: z.any().optional(),
});

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const properties = await db.property.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { matches: true } } },
  });

  return NextResponse.json(properties);
}

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data = createSchema.parse(body);

  const property = await db.property.create({
    data: {
      orgId,
      ...data,
      priceMin: data.priceMin ? BigInt(data.priceMin) : null,
      priceMax: data.priceMax ? BigInt(data.priceMax) : null,
      possessionDate: data.possessionDate ? new Date(data.possessionDate) : null,
    },
  });

  return NextResponse.json(property, { status: 201 });
}
