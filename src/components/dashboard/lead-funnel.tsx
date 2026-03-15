"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FunnelStage {
  stage: string;
  count: number;
}

const stageColors: Record<string, string> = {
  NEW: "bg-blue-400",
  CONTACTED: "bg-sky-400",
  ENGAGED: "bg-teal-400",
  SITE_VISIT: "bg-amber-400",
  NEGOTIATION: "bg-orange-400",
  CONVERTED: "bg-emerald-500",
  LOST: "bg-rose-300",
  NURTURE: "bg-violet-300",
};

const stageLabels: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  ENGAGED: "Engaged",
  SITE_VISIT: "Site Visit",
  NEGOTIATION: "Negotiation",
  CONVERTED: "Converted",
  LOST: "Lost",
  NURTURE: "Nurture",
};

export function LeadFunnel({ stages }: { stages: FunnelStage[] }) {
  const funnelStages = stages.filter(s => !["LOST", "NURTURE"].includes(s.stage));
  const otherStages = stages.filter(s => ["LOST", "NURTURE"].includes(s.stage) && s.count > 0);
  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  const totalCount = stages.reduce((sum, s) => sum + s.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lead Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {funnelStages.map((stage) => {
          const pct = totalCount > 0 ? Math.round((stage.count / totalCount) * 100) : 0;
          return (
            <div key={stage.stage} className="flex items-center gap-3">
              <span className="w-24 text-xs text-zinc-500 shrink-0">{stageLabels[stage.stage] ?? stage.stage}</span>
              <div className="flex-1">
                <div
                  className={`h-8 rounded ${stageColors[stage.stage] ?? "bg-zinc-300"} flex items-center justify-between px-2 text-xs font-medium text-white transition-all`}
                  style={{ width: `${Math.max((stage.count / maxCount) * 100, 10)}%` }}
                >
                  <span>{stage.count}</span>
                  <span className="opacity-75">{pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
        {otherStages.length > 0 && (
          <>
            <div className="border-t my-2" />
            {otherStages.map((stage) => {
              const pct = totalCount > 0 ? Math.round((stage.count / totalCount) * 100) : 0;
              return (
                <div key={stage.stage} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-zinc-500 shrink-0">{stageLabels[stage.stage] ?? stage.stage}</span>
                  <div className="flex-1">
                    <div
                      className={`h-8 rounded ${stageColors[stage.stage] ?? "bg-zinc-300"} flex items-center justify-between px-2 text-xs font-medium text-white transition-all`}
                      style={{ width: `${Math.max((stage.count / maxCount) * 100, 10)}%` }}
                    >
                      <span>{stage.count}</span>
                      <span className="opacity-75">{pct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}
