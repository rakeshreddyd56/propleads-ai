import { KPICards } from "@/components/dashboard/kpi-cards";
import { RecentLeads } from "@/components/dashboard/recent-leads";
import { SourceChart } from "@/components/dashboard/source-chart";
import { LeadFunnel } from "@/components/dashboard/lead-funnel";
import { db } from "@/lib/db";
import { resolveOrg } from "@/lib/auth";

export default async function DashboardPage() {
  const orgId = await resolveOrg();
  if (!orgId) return <div className="p-6 text-center text-zinc-400">Please create or select an organization to get started.</div>;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalLeads, leadsThisWeek, hotLeads, totalProperties, recentLeads, sourceBreakdown, statusBreakdown] = await Promise.all([
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
  ]);

  const contactedCount = statusBreakdown
    .filter(s => ["CONTACTED", "ENGAGED", "SITE_VISIT", "NEGOTIATION"].includes(s.status))
    .reduce((sum, s) => sum + s._count, 0);
  const convertedCount = statusBreakdown.find(s => s.status === "CONVERTED")?._count ?? 0;

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 mb-2">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-zinc-500">Your real estate lead intelligence at a glance</p>
      </div>

      <div data-tour="kpi-cards">
      <KPICards kpis={{
        totalLeads,
        leadsThisWeek,
        hotLeads,
        totalProperties,
        contactRate: totalLeads > 0 ? Math.round((contactedCount / totalLeads) * 100) : 0,
        conversionRate: totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0,
      }} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div data-tour="recent-leads"><RecentLeads leads={recentLeads} /></div>
        <div data-tour="source-chart"><SourceChart data={sourceBreakdown.map(s => {
          const labels: Record<string, string> = { REDDIT: "Reddit", FACEBOOK: "Facebook", TWITTER: "X/Twitter", INSTAGRAM: "Instagram", LINKEDIN: "LinkedIn", YOUTUBE: "YouTube", QUORA: "Quora", TELEGRAM: "Telegram", NINETY_NINE_ACRES: "99acres", MAGICBRICKS: "MagicBricks", NOBROKER: "NoBroker", COMMONFLOOR: "CommonFloor", GOOGLE_MAPS: "Google Maps" };
          return { platform: labels[s.platform] ?? s.platform, count: s._count };
        })} /></div>
      </div>

      <div data-tour="lead-funnel"><LeadFunnel stages={["NEW", "CONTACTED", "ENGAGED", "SITE_VISIT", "NEGOTIATION", "CONVERTED", "LOST", "NURTURE"].map(stage => ({
        stage,
        count: statusBreakdown.find(s => s.status === stage)?._count ?? 0,
      }))} /></div>
    </div>
  );
}
