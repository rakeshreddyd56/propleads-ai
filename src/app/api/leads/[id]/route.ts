import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await db.lead.findFirst({
    where: { id, orgId },
    include: {
      matches: { include: { property: true }, orderBy: { matchScore: "desc" } },
      outreachEvents: { orderBy: { createdAt: "desc" }, take: 20 },
      coachSessions: { orderBy: { createdAt: "desc" }, take: 5 },
      assignedTo: true,
      cluster: {
        include: {
          leads: {
            select: { id: true, name: true, platform: true, score: true, tier: true },
            orderBy: { score: "desc" },
          },
        },
      },
    },
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Convert BigInt fields to Number for JSON serialization
  const serialized = {
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
        : m.property,
    })),
  };

  return NextResponse.json(serialized);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Validate status field against LeadStatus enum if provided
  const validStatuses = ["NEW", "CONTACTED", "ENGAGED", "SITE_VISIT", "NEGOTIATION", "CONVERTED", "LOST", "NURTURE"] as const;
  if ("status" in body && !validStatuses.includes(body.status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  // Whitelist allowed fields
  const allowedFields = [
    "name", "email", "phone", "budget", "budgetMin", "budgetMax",
    "preferredLocations", "preferredAmenities", "preferredUnitTypes",
    "source", "assignedToId", "optInEmail", "optInWhatsApp",
    "status", "notes", "score", "tier",
  ] as const;
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) data[field] = body[field];
  }

  // Validate manual score override
  if ("score" in data) {
    const s = Number(data.score);
    if (isNaN(s) || s < 0 || s > 100) {
      return NextResponse.json({ error: "Score must be 0-100" }, { status: 400 });
    }
    data.score = s;
    // Auto-set tier based on score
    data.tier = s >= 75 ? "HOT" : s >= 40 ? "WARM" : "COLD";
  }
  if ("tier" in data && !["HOT", "WARM", "COLD"].includes(data.tier as string)) {
    return NextResponse.json({ error: "Tier must be HOT, WARM, or COLD" }, { status: 400 });
  }

  const lead = await db.lead.update({ where: { id, orgId }, data });

  // Convert BigInt fields to Number for JSON serialization
  const serialized = {
    ...lead,
    budgetMin: lead.budgetMin ? Number(lead.budgetMin) : null,
    budgetMax: lead.budgetMax ? Number(lead.budgetMax) : null,
  };

  return NextResponse.json(serialized);
}
