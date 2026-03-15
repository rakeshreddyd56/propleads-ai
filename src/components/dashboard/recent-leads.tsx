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

const platformLabels: Record<string, string> = {
  REDDIT: "Reddit", FACEBOOK: "Facebook", TWITTER: "X / Twitter", INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn", YOUTUBE: "YouTube", QUORA: "Quora", TELEGRAM: "Telegram",
  NINETY_NINE_ACRES: "99acres", MAGICBRICKS: "MagicBricks", NOBROKER: "NoBroker",
  COMMONFLOOR: "CommonFloor", GOOGLE_MAPS: "Google Maps",
};

export function RecentLeads({ leads }: { leads: RecentLead[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Leads</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {leads.length === 0 ? (
          <p className="text-sm text-zinc-400 p-6">No leads yet. Configure scraping sources to start.</p>
        ) : (
          <div className="divide-y">
            {leads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                      lead.tier === "HOT" && "bg-red-500",
                      lead.tier === "WARM" && "bg-amber-500",
                      lead.tier === "COLD" && "bg-slate-400"
                    )}
                  >
                    {lead.score}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{lead.name ?? "Unknown"}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {platformLabels[lead.platform] ?? lead.platform} {lead.preferredArea.length > 0 && `· ${lead.preferredArea[0]}`}
                    </p>
                  </div>
                </div>
                <Badge variant={lead.tier === "HOT" ? "destructive" : lead.tier === "WARM" ? "default" : "secondary"} className="text-xs shrink-0 ml-2">
                  {lead.tier}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
