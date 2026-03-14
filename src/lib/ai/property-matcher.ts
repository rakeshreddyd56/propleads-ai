import { claudeJSONFast as claudeJSON } from "@/lib/claude";

export interface MatchResult {
  propertyId: string;
  score: number;
  reasons: string[];
  aiSummary: string;
}

export async function matchLeadToProperties(
  lead: { budget: string | null; budgetMin: bigint | null; budgetMax: bigint | null; preferredArea: string[]; propertyType: string | null; buyerPersona: string | null; intentSignals: any; originalText: string | null },
  properties: { id: string; name: string; area: string; propertyType: string; unitTypes: any; priceMin: bigint | null; priceMax: bigint | null; usps: string[]; amenities: string[] }[]
): Promise<MatchResult[]> {
  if (properties.length === 0) return [];

  const propertyList = properties.map((p) => ({
    id: p.id,
    name: p.name,
    area: p.area,
    type: p.propertyType,
    units: p.unitTypes,
    priceRange: `${p.priceMin ? Number(p.priceMin) / 100000 : "?"} - ${p.priceMax ? Number(p.priceMax) / 100000 : "?"} lakhs`,
    usps: p.usps,
    amenities: p.amenities,
  }));

  return claudeJSON<MatchResult[]>(`
Match this lead to the best properties. Return top 3 max.

Lead:
- Budget: ${lead.budget ?? "not specified"} (${lead.budgetMin ? Number(lead.budgetMin) / 100000 : "?"} - ${lead.budgetMax ? Number(lead.budgetMax) / 100000 : "?"} lakhs)
- Preferred areas: ${lead.preferredArea?.join(", ") || "any"}
- Property type: ${lead.propertyType ?? "any"}
- Persona: ${lead.buyerPersona ?? "unknown"}
- Intent signals: ${JSON.stringify(lead.intentSignals ?? {})}
- Original post: "${lead.originalText ?? "N/A"}"

Properties:
${JSON.stringify(propertyList, null, 2)}

Return JSON array:
[{ "propertyId": "id", "score": 0-100, "reasons": ["budget_fit", "area_match"], "aiSummary": "Why this property fits in 1-2 sentences, mentioning specific USPs relevant to this buyer" }]
Return empty array if no good matches.
`);
}
