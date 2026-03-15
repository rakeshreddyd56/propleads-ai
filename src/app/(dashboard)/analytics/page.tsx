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
        <span className="font-medium">{used}{isUnlimited ? " (unlimited)" : ` / ${limit}`}</span>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
        {isUnlimited ? (
          <div className="h-full bg-green-400 rounded-full w-full opacity-50" />
        ) : (
          <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
        )}
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
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></div>;

  const usage = data?.usage;
  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 mb-2">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-zinc-500">Track your lead generation and conversion performance</p>
      </div>

      {kpis && <KPICards kpis={kpis} />}

      {/* Usage & Plan Meters */}
      {usage && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card data-tour="usage-meters">
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

          <Card data-tour="platform-health">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-500" />
                <CardTitle className="text-sm">Platform Health</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-600">Scraping Success Rate</span>
                <span className={cn("font-bold text-lg", (kpis?.scrapingSuccessRate ?? 0) >= 80 ? "text-green-600" : "text-amber-600")}>
                  {kpis?.scrapingSuccessRate ?? 0}%
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
        <Card data-tour="tier-breakdown">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Lead Quality Distribution</CardTitle>
              <div className="flex items-center gap-3">
                {[{ label: "Hot", color: "bg-red-500" }, { label: "Warm", color: "bg-amber-500" }, { label: "Cold", color: "bg-slate-400" }].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span className={cn("inline-block h-2.5 w-2.5 rounded-full", item.color)} />
                    <span className="text-xs text-zinc-500">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {data.tierBreakdown.map((t: any) => {
                const colors: Record<string, string> = { HOT: "bg-red-500", WARM: "bg-amber-500", COLD: "bg-slate-400" };
                const total = data.tierBreakdown.reduce((s: number, x: any) => s + x.count, 0);
                const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                return (
                  <div key={t.tier} className="flex-1 text-center">
                    <div className="h-2 rounded-full bg-zinc-100 mb-2 overflow-hidden">
                      <div className={cn("h-full rounded-full", colors[t.tier] ?? "bg-zinc-400")} style={{ width: `${pct}%` }} />
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

      <Card data-tour="source-performance">
        <CardHeader><CardTitle className="text-base">Source Performance</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-zinc-950">
                <tr className="border-b">
                  <th className="text-left font-medium text-zinc-500 px-6 py-3">Platform</th>
                  <th className="text-right font-medium text-zinc-500 px-6 py-3">Leads</th>
                  <th className="text-right font-medium text-zinc-500 px-6 py-3">Avg Score</th>
                  {sources.some((s: any) => s.successRate !== undefined) && (
                    <th className="text-right font-medium text-zinc-500 px-6 py-3">Success Rate</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {sources.map((s: any) => {
                  const platformLabels: Record<string, string> = {
                    REDDIT: "Reddit", FACEBOOK: "Facebook", TWITTER: "X / Twitter", INSTAGRAM: "Instagram",
                    LINKEDIN: "LinkedIn", YOUTUBE: "YouTube", QUORA: "Quora", TELEGRAM: "Telegram",
                    NINETY_NINE_ACRES: "99acres", MAGICBRICKS: "MagicBricks", NOBROKER: "NoBroker",
                    COMMONFLOOR: "CommonFloor", GOOGLE_MAPS: "Google Maps",
                  };
                  const rate = s.successRate as number | undefined;
                  const rateColor = rate !== undefined
                    ? rate >= 80 ? "text-green-600" : rate >= 50 ? "text-amber-600" : "text-red-500"
                    : "";
                  return (
                    <tr key={s.platform} className="hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                      <td className="px-6 py-3 font-medium">{platformLabels[s.platform] ?? s.platform}</td>
                      <td className="px-6 py-3 text-right tabular-nums">{s.count}</td>
                      <td className="px-6 py-3 text-right tabular-nums text-zinc-500">{s.avgScore}</td>
                      {rate !== undefined && (
                        <td className={cn("px-6 py-3 text-right font-semibold tabular-nums", rateColor)}>{rate}%</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
