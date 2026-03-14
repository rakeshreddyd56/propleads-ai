import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, IndianRupee } from "lucide-react";

function formatPrice(paise: bigint | null): string {
  if (!paise) return "N/A";
  const lakhs = Number(paise) / 100000;
  if (lakhs >= 100) return `${(lakhs / 100).toFixed(1)} Cr`;
  return `${lakhs.toFixed(0)} L`;
}

export function PropertyCard({ property: p, matchCount }: { property: any; matchCount: number }) {
  return (
    <Link href={`/properties/${p.id}`}>
      <Card className="transition-shadow hover:shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{p.name}</CardTitle>
            <Badge variant={p.status === "ACTIVE" ? "default" : "secondary"}>{p.status === "ACTIVE" ? "Active" : p.status === "SOLD_OUT" ? "Sold Out" : p.status?.replace(/_/g, " ") ?? p.status}</Badge>
          </div>
          {p.builderName && <p className="text-sm text-zinc-500">{p.builderName}</p>}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <MapPin className="h-3.5 w-3.5" />
            <span>{p.area}, {p.city}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <IndianRupee className="h-3.5 w-3.5" />
            <span>{formatPrice(p.priceMin)} — {formatPrice(p.priceMax)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Users className="h-3.5 w-3.5" />
            <span>{matchCount} matched leads</span>
          </div>
          {p.reraNumber && (
            <p className="text-xs text-green-600 font-medium">RERA: {p.reraNumber}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {(p.unitTypes as any[])?.slice(0, 3).map((u: any, i: number) => (
              <Badge key={i} variant="outline" className="text-xs">{u.type}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
