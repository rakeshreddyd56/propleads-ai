"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FunnelStage {
  stage: string;
  count: number;
}

const stageColors: Record<string, string> = {
  NEW: "bg-blue-500",
  CONTACTED: "bg-cyan-500",
  ENGAGED: "bg-green-500",
  SITE_VISIT: "bg-yellow-500",
  NEGOTIATION: "bg-orange-500",
  CONVERTED: "bg-emerald-600",
  LOST: "bg-red-400",
  NURTURE: "bg-violet-400",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lead Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {funnelStages.map((stage) => (
          <div key={stage.stage} className="flex items-center gap-3">
            <span className="w-24 text-xs text-zinc-500">{stageLabels[stage.stage] ?? stage.stage}</span>
            <div className="flex-1">
              <div
                className={`h-6 rounded ${stageColors[stage.stage] ?? "bg-zinc-300"} flex items-center px-2 text-xs font-medium text-white transition-all`}
                style={{ width: `${Math.max((stage.count / maxCount) * 100, 8)}%` }}
              >
                {stage.count}
              </div>
            </div>
          </div>
        ))}
        {otherStages.length > 0 && (
          <>
            <div className="border-t my-2" />
            {otherStages.map((stage) => (
              <div key={stage.stage} className="flex items-center gap-3">
                <span className="w-24 text-xs text-zinc-500">{stageLabels[stage.stage] ?? stage.stage}</span>
                <div className="flex-1">
                  <div
                    className={`h-6 rounded ${stageColors[stage.stage] ?? "bg-zinc-300"} flex items-center px-2 text-xs font-medium text-white transition-all`}
                    style={{ width: `${Math.max((stage.count / maxCount) * 100, 8)}%` }}
                  >
                    {stage.count}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
