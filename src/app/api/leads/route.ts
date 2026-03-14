import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const tierParam = url.searchParams.get("tier");
  const statusParam = url.searchParams.get("status");
  const platformParam = url.searchParams.get("platform");
  const search = url.searchParams.get("search")?.trim().slice(0, 200) ?? null;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50") || 50));

  // Whitelist allowed enum values to prevent injection
  const validTiers = ["HOT", "WARM", "COLD"] as const;
  const validStatuses = ["NEW", "CONTACTED", "ENGAGED", "NURTURE", "SITE_VISIT", "NEGOTIATION", "CONVERTED", "LOST"] as const;
  const validPlatforms = ["REDDIT", "FACEBOOK", "TWITTER", "QUORA", "GOOGLE_MAPS", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER", "COMMONFLOOR", "INSTAGRAM", "LINKEDIN", "YOUTUBE", "TELEGRAM"] as const;

  const tier = validTiers.includes(tierParam as any) ? tierParam : null;
  const status = validStatuses.includes(statusParam as any) ? statusParam : null;
  const platform = validPlatforms.includes(platformParam as any) ? platformParam : null;

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
      property: m.property
        ? {
            ...m.property,
            priceMin: m.property.priceMin ? Number(m.property.priceMin) : null,
            priceMax: m.property.priceMax ? Number(m.property.priceMax) : null,
          }
        : null,
    })),
  }));

  return NextResponse.json({ leads: serialized, total: Number(total), page, limit });
}
