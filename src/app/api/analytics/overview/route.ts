import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalLeads,
    leadsThisWeek,
    hotLeads,
    totalProperties,
    recentLeads,
    sourceBreakdown,
    statusBreakdown,
    contactedCount,
    convertedCount,
  ] = await Promise.all([
    db.lead.count({ where: { orgId } }),
    db.lead.count({ where: { orgId, createdAt: { gte: weekAgo } } }),
    db.lead.count({ where: { orgId, tier: "HOT" } }),
    db.property.count({ where: { orgId, status: "ACTIVE" } }),
    db.lead.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, platform: true, tier: true, score: true, createdAt: true, preferredArea: true },
    }),
    db.lead.groupBy({ by: ["platform"], where: { orgId }, _count: true }),
    db.lead.groupBy({ by: ["status"], where: { orgId }, _count: true }),
    db.lead.count({ where: { orgId, status: { in: ["CONTACTED", "ENGAGED", "SITE_VISIT", "NEGOTIATION"] } } }),
    db.lead.count({ where: { orgId, status: "CONVERTED" } }),
  ]);

  return NextResponse.json({
    kpis: {
      totalLeads,
      leadsThisWeek,
      hotLeads,
      totalProperties,
      contactRate: totalLeads > 0 ? Math.round((contactedCount / totalLeads) * 100) : 0,
      conversionRate: totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0,
    },
    recentLeads,
    sourceBreakdown: sourceBreakdown.map((s) => ({ platform: s.platform, count: s._count })),
    statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count })),
  });
}
