import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { HYDERABAD_AREAS, BUYER_PERSONAS } from "@/lib/utils/constants";
import { TrendingUp, MapPin, Users } from "lucide-react";

export default function MarketPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Market Intelligence</h1>
        <p className="text-sm text-zinc-500">Hyderabad real estate micro-market data and buyer insights</p>
      </div>

      <div data-tour="micro-markets">
        <h2 className="text-lg font-semibold mb-4">Micro-Markets</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {HYDERABAD_AREAS.sort((a, b) => b.hotness - a.hotness).map((area) => (
            <Card key={area.name} className="relative overflow-hidden">
              <div className="absolute right-2 top-2">
                <Badge variant={area.hotness >= 85 ? "destructive" : area.hotness >= 70 ? "default" : "secondary"} className="text-xs">
                  {area.hotness >= 85 ? "Hot" : area.hotness >= 70 ? "Warm" : "Emerging"}
                </Badge>
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-500" />
                  <span className="font-semibold">{area.name}</span>
                </div>
                <p className="text-sm text-zinc-600">₹{area.pricePerSqft.min.toLocaleString()} — ₹{area.pricePerSqft.max.toLocaleString()} /sqft</p>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">{area.growth}% YoY growth</span>
                </div>
                <Progress value={area.hotness} className="h-1.5" />
                <p className="text-xs text-zinc-400">{area.persona.replace(/_/g, " ")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div data-tour="personas">
        <h2 className="text-lg font-semibold mb-4">Buyer Personas</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(BUYER_PERSONAS).map(([key, persona]) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: persona.color }} />
                  <CardTitle className="text-base">{persona.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm"><strong>Budget:</strong> {persona.budget}</p>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Top Areas</p>
                  <div className="flex flex-wrap gap-1">
                    {persona.areas.map(a => <Badge key={a} variant="outline" className="text-xs">{a}</Badge>)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
