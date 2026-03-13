import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const tier = url.searchParams.get("tier") as any;
  const status = url.searchParams.get("status") as any;
  const platform = url.searchParams.get("platform") as any;
  const search = url.searchParams.get("search");
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "50");

  const where: any = { orgId };
  if (tier) where.tier = tier;
  if (status) where.status = status;
  if (platform) where.platform = platform;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { originalText: { contains: search, mode: "insensitive" } },
      { preferredArea: { hasSome: [search] } },
    ];
  }

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { score: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        matches: { include: { property: true }, take: 3, orderBy: { matchScore: "desc" } },
        _count: { select: { outreachEvents: true } },
      },
    }),
    db.lead.count({ where }),
  ]);

  // Convert BigInt to Number for JSON serialization
  const serialized = leads.map((lead) => ({
    ...lead,
    budgetMin: lead.budgetMin ? Number(lead.budgetMin) : null,
    budgetMax: lead.budgetMax ? Number(lead.budgetMax) : null,
    matches: lead.matches.map((m) => ({
      ...m,
      property: {
        ...m.property,
        priceMin: m.property.priceMin ? Number(m.property.priceMin) : null,
        priceMax: m.property.priceMax ? Number(m.property.priceMax) : null,
      },
    })),
  }));

  return NextResponse.json({ leads: serialized, total, page, limit });
}
