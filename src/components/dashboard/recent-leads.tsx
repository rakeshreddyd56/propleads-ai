import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RecentLead {
  id: string;
  name: string | null;
  platform: string;
  tier: string;
  score: number;
  createdAt: Date | string;
  preferredArea: string[];
}

export function RecentLeads({ leads }: { leads: RecentLead[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Leads</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {leads.length === 0 ? (
          <p className="text-sm text-zinc-400">No leads yet. Configure scraping sources to start.</p>
        ) : (
          leads.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white",
                    lead.tier === "HOT" && "bg-red-500",
                    lead.tier === "WARM" && "bg-orange-500",
                    lead.tier === "COLD" && "bg-blue-400"
                  )}
                >
                  {lead.score}
                </div>
                <div>
                  <p className="text-sm font-medium">{lead.name ?? "Unknown"}</p>
                  <p className="text-xs text-zinc-500">
                    {lead.platform} {lead.preferredArea.length > 0 && `· ${lead.preferredArea[0]}`}
                  </p>
                </div>
              </div>
              <Badge variant={lead.tier === "HOT" ? "destructive" : lead.tier === "WARM" ? "default" : "secondary"} className="text-xs">
                {lead.tier}
              </Badge>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
