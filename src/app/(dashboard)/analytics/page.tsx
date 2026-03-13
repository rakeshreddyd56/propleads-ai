"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { SourceChart } from "@/components/dashboard/source-chart";
import { LeadFunnel } from "@/components/dashboard/lead-funnel";
import { Loader2, Sparkles, Link2, Activity, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

function UsageMeter({ label, used, limit, color }: { label: string; used: number; limit: number; color: string }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isUnlimited = limit >= 999;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-zinc-600">{label}</span>
        <span className="font-medium">{used}{isUnlimited ? "" : ` / ${limit}`}</span>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: isUnlimited ? "5%" : `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics/overview").then(r => r.json()),
      fetch("/api/analytics/funnel").then(r => r.json()),
      fetch("/api/analytics/sources").then(r => r.json()),
    ]).then(([overview, funnelData, sourceData]) => {
      setData(overview);
      setFunnel(funnelData);
      setSources(sourceData);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></div>;

  const usage = data?.usage;
  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-zinc-500">Track your lead generation and conversion performance</p>
      </div>

      {kpis && <KPICards kpis={kpis} />}

      {/* Usage & Plan Meters */}
      {usage && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm">Usage This Period</CardTitle>
                <Badge variant="outline" className="text-[10px] ml-auto">{usage.tier}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <UsageMeter label="Runs Today" used={usage.runsToday} limit={usage.runsLimit} color="bg-blue-500" />
              <UsageMeter label="Leads This Month" used={usage.leadsThisMonth} limit={usage.leadsLimit} color="bg-green-500" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-500" />
                <CardTitle className="text-sm">Platform Health</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600">Scraping Success Rate</span>
                <span className={cn("font-bold text-lg", (kpis?.scrapingSuccessRate ?? 100) >= 80 ? "text-green-600" : "text-amber-600")}>
                  {kpis?.scrapingSuccessRate ?? 100}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Enrichment Rate</span>
                <span className="font-bold text-lg text-purple-600">{kpis?.enrichmentRate ?? 0}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600 flex items-center gap-1"><Link2 className="h-3 w-3" /> Cross-platform Clusters</span>
                <span className="font-bold text-lg text-indigo-600">{kpis?.clusterCount ?? 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lead Tier Breakdown */}
      {data?.tierBreakdown && data.tierBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Lead Quality Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {data.tierBreakdown.map((t: any) => {
                const colors: Record<string, string> = { HOT: "bg-red-500", WARM: "bg-amber-500", COLD: "bg-zinc-400" };
                const total = data.tierBreakdown.reduce((s: number, x: any) => s + x.count, 0);
                const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                return (
                  <div key={t.tier} className="flex-1 text-center">
                    <div className="h-2 rounded-full bg-zinc-100 mb-2 overflow-hidden">
                      <div className={cn("h-full rounded-full", colors[t.tier] ?? "bg-zinc-400")} style={{ width: "100%" }} />
                    </div>
                    <p className="text-lg font-bold">{t.count}</p>
                    <p className="text-xs text-zinc-500">{t.tier} ({pct}%)</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SourceChart data={sources.map((s: any) => ({ platform: s.platform, count: s.count }))} />
        <LeadFunnel stages={funnel} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Source Performance</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sources.map((s: any) => (
              <div key={s.platform} className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">{s.platform}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm">{s.count} leads</span>
                  <span className="text-sm text-zinc-500">Avg score: {s.avgScore}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
