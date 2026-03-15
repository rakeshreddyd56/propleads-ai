import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HYDERABAD_AREAS, BUYER_PERSONAS } from "@/lib/utils/constants";
import { TrendingUp, MapPin, IndianRupee, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const personaColors: Record<string, { bg: string; text: string }> = {
  IT_PROFESSIONAL: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
  NRI: { bg: "bg-violet-50 border-violet-200", text: "text-violet-700" },
  FIRST_TIME_BUYER: { bg: "bg-green-50 border-green-200", text: "text-green-700" },
  INVESTOR: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  LUXURY_BUYER: { bg: "bg-pink-50 border-pink-200", text: "text-pink-700" },
  FAMILY_UPGRADER: { bg: "bg-teal-50 border-teal-200", text: "text-teal-700" },
};

function formatPersona(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()).replace(/\bNri\b/, "NRI").replace(/\bIt\b/, "IT");
}

function formatPrice(val: number) {
  if (val >= 1000) return `${(val / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return val.toLocaleString("en-IN");
}

export default function MarketPage() {
  const sorted = [...HYDERABAD_AREAS].sort((a, b) => b.hotness - a.hotness);
  const hotCount = sorted.filter(a => a.hotness >= 85).length;
  const warmCount = sorted.filter(a => a.hotness >= 70 && a.hotness < 85).length;

  return (
    <div className="space-y-8">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">Market Intelligence</h1>
        <p className="text-sm text-zinc-500">Hyderabad real estate micro-market data and buyer insights</p>
      </div>

      {/* Persona Color Legend */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-xs font-medium text-zinc-500 mr-1">Buyer Types:</span>
            {Object.entries(BUYER_PERSONAS).map(([key, persona]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: persona.color }} />
                <span className="text-xs text-zinc-600">{persona.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Micro-Markets */}
      <div data-tour="micro-markets">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Micro-Markets</h2>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />{hotCount} Hot</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />{warmCount} Warm</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" />{sorted.length - hotCount - warmCount} Emerging</span>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((area) => {
            const pColors = personaColors[area.persona] ?? { bg: "bg-zinc-50", text: "text-zinc-600" };
            const hotLevel = area.hotness >= 85 ? "hot" : area.hotness >= 70 ? "warm" : "emerging";
            const borderColor = hotLevel === "hot" ? "border-l-red-500" : hotLevel === "warm" ? "border-l-amber-400" : "border-l-slate-300";

            return (
              <Card key={area.name} className={cn("border-l-4 overflow-hidden", borderColor)}>
                <CardContent className="p-4 space-y-3">
                  {/* Header: name + badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="h-4 w-4 text-zinc-400 shrink-0" />
                      <span className="font-semibold text-sm truncate">{area.name}</span>
                    </div>
                    <Badge
                      variant={hotLevel === "hot" ? "destructive" : hotLevel === "warm" ? "default" : "secondary"}
                      className="text-[10px] shrink-0"
                    >
                      {area.hotness}
                    </Badge>
                  </div>

                  {/* Price + Growth row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <IndianRupee className="h-3 w-3 text-zinc-400" />
                      <span className="text-sm font-medium">{formatPrice(area.pricePerSqft.min)} – {formatPrice(area.pricePerSqft.max)}</span>
                      <span className="text-[10px] text-zinc-400">/sqft</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className={cn("h-3 w-3", area.growth >= 20 ? "text-green-500" : "text-zinc-400")} />
                      <span className={cn("text-xs font-medium", area.growth >= 20 ? "text-green-600" : "text-zinc-500")}>{area.growth}%</span>
                    </div>
                  </div>

                  {/* Hotness bar */}
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        hotLevel === "hot" ? "bg-red-500" : hotLevel === "warm" ? "bg-amber-400" : "bg-slate-300"
                      )}
                      style={{ width: `${area.hotness}%` }}
                    />
                  </div>

                  {/* Persona tag */}
                  <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium", pColors.bg, pColors.text)}>
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: BUYER_PERSONAS[area.persona as keyof typeof BUYER_PERSONAS]?.color ?? "#94a3b8" }} />
                    {formatPersona(area.persona)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Buyer Personas */}
      <div data-tour="personas">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Buyer Personas</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Common buyer types in Hyderabad — use these to understand your leads</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(BUYER_PERSONAS).map(([key, persona]) => {
            const pColors = personaColors[key] ?? { bg: "bg-zinc-50", text: "text-zinc-600" };
            return (
              <Card key={key} className={cn("border-t-4")} style={{ borderTopColor: persona.color }}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{persona.label}</CardTitle>
                    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", pColors.bg, pColors.text)}>
                      <Wallet className="h-3 w-3" />
                      {persona.budget}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-zinc-500 mb-2">Preferred Areas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {persona.areas.map(a => <Badge key={a} variant="outline" className="text-xs">{a}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
