const BUDGET_PATTERNS = [
  /(\d+)\s*(?:to|-)\s*(\d+)\s*(?:lakhs?|lacs?|L)/i,
  /(\d+)\s*(?:lakhs?|lacs?|L)/i,
  /(\d+)\s*(?:cr(?:ore)?s?)/i,
  /budget[:\s]+(?:Rs\.?\s*)?(\d[\d,.]*)/i,
  /(\d+)\s*(?:to|-)\s*(\d+)\s*(?:cr(?:ore)?s?)/i,
];

const AREA_NAMES = [
  "Gachibowli", "Kondapur", "Madhapur", "HITEC City", "Kokapet", "Narsingi",
  "Financial District", "Tellapur", "Kollur", "Shamshabad", "Adibatla",
  "Kompally", "Medchal", "Miyapur", "Kukatpally", "Manikonda", "Puppalaguda",
  "Bachupally", "Patancheru", "Jubilee Hills", "Banjara Hills",
];

export function extractBudget(text: string): { min: number | null; max: number | null; raw: string | null } {
  for (const pattern of BUDGET_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      if (pattern.source.includes("cr")) {
        const val1 = parseFloat(match[1]) * 10000000;
        const val2 = match[2] ? parseFloat(match[2]) * 10000000 : null;
        return { min: val1, max: val2 ?? val1, raw: match[0] };
      }
      const val1 = parseFloat(match[1]) * 100000;
      const val2 = match[2] ? parseFloat(match[2]) * 100000 : null;
      return { min: val1, max: val2 ?? val1, raw: match[0] };
    }
  }
  return { min: null, max: null, raw: null };
}

export function extractAreas(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const area of AREA_NAMES) {
    if (lower.includes(area.toLowerCase())) {
      found.push(area);
    }
  }
  return found;
}

export function extractPropertyType(text: string): string | null {
  const types = ["1BHK", "2BHK", "3BHK", "4BHK", "villa", "plot", "penthouse", "independent house", "duplex"];
  const lower = text.toLowerCase();
  for (const t of types) {
    if (lower.includes(t.toLowerCase())) return t;
  }
  return null;
}

export function isPropertyRelated(text: string): boolean {
  const keywords = [
    "flat", "apartment", "buy", "house", "property", "bhk", "villa", "plot",
    "gated community", "real estate", "rent", "looking for", "suggest",
    "recommend", "budget", "rera", "possession", "builder",
  ];
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}
