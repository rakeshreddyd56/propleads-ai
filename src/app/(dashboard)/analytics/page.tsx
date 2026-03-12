"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { SourceChart } from "@/components/dashboard/source-chart";
import { LeadFunnel } from "@/components/dashboard/lead-funnel";
import { Loader2 } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-zinc-500">Track your lead generation and conversion performance</p>
      </div>

      {data?.kpis && <KPICards kpis={data.kpis} />}

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
