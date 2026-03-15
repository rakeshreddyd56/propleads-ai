import { Card, CardContent } from "@/components/ui/card";
import { Users, Flame, Building2, TrendingUp, MessageSquare, Target } from "lucide-react";

const cards = [
  { key: "totalLeads", label: "Total Leads", hint: "All leads captured across sources", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  { key: "leadsThisWeek", label: "This Week", hint: "New leads in the last 7 days", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
  { key: "hotLeads", label: "Hot Leads", hint: "High-intent, ready-to-buy leads", icon: Flame, color: "text-red-600", bg: "bg-red-50" },
  { key: "totalProperties", label: "Properties", hint: "Active listings in your portfolio", icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
  { key: "contactRate", label: "Contact Rate", hint: "% of leads you've reached out to", icon: MessageSquare, color: "text-orange-600", bg: "bg-orange-50", suffix: "%" },
  { key: "conversionRate", label: "Conversion", hint: "% of leads that converted to sale", icon: Target, color: "text-emerald-600", bg: "bg-emerald-50", suffix: "%" },
];

export function KPICards({ kpis }: { kpis: Record<string, number> }) {
  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.key}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="text-xs font-medium text-zinc-500">{card.label}</p>
            </div>
            <p className="text-2xl font-bold truncate">
              {kpis[card.key] ?? 0}{card.suffix ?? ""}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1 leading-tight">{card.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
