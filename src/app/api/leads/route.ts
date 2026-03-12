import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { orgId } = await auth();
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

  return NextResponse.json({ leads, total, page, limit });
}
