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

  const leads = await db.lead.findMany({
    where,
    orderBy: { score: "desc" },
    take: 5000,
    select: {
      name: true,
      email: true,
      phone: true,
      platform: true,
      score: true,
      tier: true,
      status: true,
      budget: true,
      budgetMin: true,
      budgetMax: true,
      preferredArea: true,
      propertyType: true,
      timeline: true,
      buyerPersona: true,
      company: true,
      jobTitle: true,
      notes: true,
      sourceUrl: true,
      createdAt: true,
      lastSeenAt: true,
    },
  });

  const headers = [
    "Name", "Email", "Phone", "Platform", "Score", "Tier", "Status",
    "Budget", "Budget Min", "Budget Max", "Preferred Areas", "Property Type",
    "Timeline", "Buyer Persona", "Company", "Job Title", "Notes",
    "Source URL", "Created", "Last Seen",
  ];

  const rows = leads.map((l) => [
    l.name ?? "",
    l.email ?? "",
    l.phone ?? "",
    l.platform,
    String(l.score),
    l.tier ?? "",
    l.status,
    l.budget ?? "",
    l.budgetMin ? String(Number(l.budgetMin)) : "",
    l.budgetMax ? String(Number(l.budgetMax)) : "",
    (l.preferredArea ?? []).join("; "),
    l.propertyType ?? "",
    l.timeline ?? "",
    l.buyerPersona ?? "",
    l.company ?? "",
    l.jobTitle ?? "",
    (l.notes ?? "").replace(/[\n\r]/g, " "),
    l.sourceUrl ?? "",
    l.createdAt ? new Date(l.createdAt).toISOString().split("T")[0] : "",
    l.lastSeenAt ? new Date(l.lastSeenAt).toISOString().split("T")[0] : "",
  ]);

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="propleads-leads-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
