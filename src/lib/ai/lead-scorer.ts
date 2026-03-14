import { claudeJSONFast as claudeJSON } from "@/lib/claude";

export interface ScoreResult {
  total: number;
  breakdown: {
    budget: number;
    location: number;
    timeline: number;
    engagement: number;
    profile: number;
    social: number;
  };
  tier: "HOT" | "WARM" | "COLD";
  reasoning: string;
}

export async function scoreLead(lead: {
  originalText: string | null;
  budget: string | null;
  preferredArea: string[];
  timeline: string | null;
  platform: string;
  buyerPersona: string | null;
}, availableAreas: string[], priceRange: { min: number | null; max: number | null } = { min: null, max: null }): Promise<ScoreResult> {
  const priceContext = priceRange.min != null && priceRange.max != null
    ? `Our property prices range from ${priceRange.min} lakhs to ${priceRange.max} lakhs.`
    : priceRange.min != null
    ? `Our property prices start from ${priceRange.min} lakhs.`
    : priceRange.max != null
    ? `Our property prices go up to ${priceRange.max} lakhs.`
    : "";

  return claudeJSON<ScoreResult>(`
Score this real estate lead for Hyderabad market. Our properties are in: ${availableAreas.join(", ")}.${priceContext ? `\n${priceContext}` : ""}

Lead details:
- Original post: "${lead.originalText ?? "N/A"}"
- Stated budget: ${lead.budget ?? "not mentioned"}
- Preferred areas: ${lead.preferredArea.length ? lead.preferredArea.join(", ") : "not specified"}
- Timeline: ${lead.timeline ?? "not mentioned"}
- Platform: ${lead.platform}
- Buyer persona: ${lead.buyerPersona ?? "unknown"}

Score on this scale (total 100):
- budget (0-25): How well their budget aligns with our property price range
- location (0-20): Do their preferred areas match our properties
- timeline (0-15): How urgently are they looking (higher = more urgent)
- engagement (0-15): How detailed/specific was their inquiry
- profile (0-15): How well do they fit target buyer personas (IT pro, NRI, investor)
- social (0-10): Platform credibility (Reddit detailed post > quick comment)

Return JSON: { total, breakdown: {budget, location, timeline, engagement, profile, social}, tier: "HOT"|"WARM"|"COLD", reasoning: "one sentence" }
- HOT: 75-100, WARM: 40-74, COLD: 0-39
`);
}
