import { Card, CardContent } from "@/components/ui/card";
import { Users, Flame, Building2, TrendingUp, MessageSquare, Target } from "lucide-react";

const cards = [
  { key: "totalLeads", label: "Total Leads", icon: Users, color: "text-blue-600" },
  { key: "leadsThisWeek", label: "This Week", icon: TrendingUp, color: "text-green-600" },
  { key: "hotLeads", label: "Hot Leads", icon: Flame, color: "text-red-600" },
  { key: "totalProperties", label: "Properties", icon: Building2, color: "text-purple-600" },
  { key: "contactRate", label: "Contact Rate", icon: MessageSquare, color: "text-orange-600", suffix: "%" },
  { key: "conversionRate", label: "Conversion", icon: Target, color: "text-emerald-600", suffix: "%" },
];

export function KPICards({ kpis }: { kpis: Record<string, number> }) {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.key}>
          <CardContent className="flex items-center gap-3 p-4">
            <card.icon className={`h-8 w-8 ${card.color}`} />
            <div>
              <p className="text-2xl font-bold">
                {kpis[card.key] ?? 0}{card.suffix ?? ""}
              </p>
              <p className="text-xs text-zinc-500">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
