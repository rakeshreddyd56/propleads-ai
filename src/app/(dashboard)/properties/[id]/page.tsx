import { db } from "@/lib/db";
import { resolveOrg } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, IndianRupee, Calendar, Shield, FileText } from "lucide-react";
import { PropertyActions } from "@/components/properties/property-actions";

function formatPrice(paise: bigint | number | null): string {
  if (!paise || Number(paise) === 0) return "";
  const lakhs = Number(paise) / 100000;
  if (lakhs >= 100) return `${(lakhs / 100).toFixed(1)} Cr`;
  return `${lakhs.toFixed(0)} L`;
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const orgId = await resolveOrg();
  if (!orgId) return <div className="p-6 text-center text-zinc-400">Please create or select an organization to get started.</div>;

  const { id } = await params;
  const property = await db.property.findFirst({
    where: { id, orgId },
    include: { matches: { include: { lead: true }, orderBy: { matchScore: "desc" }, take: 20 } },
  });

  if (!property) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{property.name}</h1>
          {property.builderName && <p className="text-zinc-500">{property.builderName}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={property.status === "ACTIVE" ? "default" : "secondary"} className="text-sm">{property.status === "ACTIVE" ? "Active" : property.status === "SOLD_OUT" ? "Sold Out" : property.status?.replace(/_/g, " ") ?? property.status}</Badge>
          {property.brochureUrl && (
            <a href={property.brochureUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" /> View Brochure
              </Button>
            </a>
          )}
          <PropertyActions propertyId={property.id} property={property} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <MapPin className="h-6 w-6 text-blue-500" />
            <div>
              <p className="font-medium">{property.area}</p>
              <p className="text-xs text-zinc-500">{property.location}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <IndianRupee className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-medium">{formatPrice(property.priceMin) && formatPrice(property.priceMax) ? `${formatPrice(property.priceMin)} — ${formatPrice(property.priceMax)}` : formatPrice(property.priceMin) || formatPrice(property.priceMax) || "Price on Request"}</p>
              <p className="text-xs text-zinc-500">Price Range</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="h-6 w-6 text-purple-500" />
            <div>
              <p className="font-medium">{property.possessionDate ? new Date(property.possessionDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "Ready"}</p>
              <p className="text-xs text-zinc-500">Possession</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Shield className="h-6 w-6 text-emerald-500" />
            <div>
              <p className="font-medium">{property.reraNumber ?? "N/A"}</p>
              <p className="text-xs text-zinc-500">RERA Number</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {property.description && (
        <Card>
          <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-600 whitespace-pre-line">{property.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Unit Types</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(property.unitTypes as any[])?.map((u: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">{u.type}</span>
                <span className="text-sm text-zinc-500">{u.sizeSqft ? `${u.sizeSqft} sqft` : "Size TBD"}</span>
                <span className="font-medium text-green-600">{u.priceINR ? `₹${(u.priceINR / 100000).toFixed(0)}L` : "Price TBD"}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Amenities</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {(property.amenities ?? []).map((a, i) => <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">USPs</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm space-y-1">
                {(property.usps ?? []).map((u, i) => <li key={i}>{u}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Matched Leads ({property.matches.length})</CardTitle></CardHeader>
        <CardContent>
          {property.matches.length === 0 ? (
            <p className="text-sm text-zinc-400">No leads matched yet.</p>
          ) : (
            <div className="space-y-2">
              {property.matches.map((m) => (
                <Link key={m.id} href={`/leads/${m.lead.id}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-zinc-50 transition-colors">
                  <div>
                    <p className="font-medium">{m.lead.name ?? "Unknown"}</p>
                    <p className="text-xs text-zinc-500">{({"REDDIT":"Reddit","FACEBOOK":"Facebook","TWITTER":"X / Twitter","INSTAGRAM":"Instagram","LINKEDIN":"LinkedIn","YOUTUBE":"YouTube","QUORA":"Quora","TELEGRAM":"Telegram","NINETY_NINE_ACRES":"99acres","MAGICBRICKS":"MagicBricks","NOBROKER":"NoBroker","COMMONFLOOR":"CommonFloor","GOOGLE_MAPS":"Google Maps"} as Record<string,string>)[m.lead.platform] ?? m.lead.platform} · {m.lead.budget ?? "No budget"}</p>
                    {m.aiSummary && <p className="mt-1 text-xs text-zinc-600">{m.aiSummary}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{m.matchScore}%</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
