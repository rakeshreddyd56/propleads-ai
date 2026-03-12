import { claudeJSON } from "@/lib/claude";

export interface DetectedIntent {
  isPropertySeeker: boolean;
  confidence: number;
  budget: { min: number | null; max: number | null; raw: string | null };
  preferredAreas: string[];
  propertyType: string | null;
  timeline: string | null;
  persona: "IT_PROFESSIONAL" | "NRI" | "FIRST_TIME_BUYER" | "INVESTOR" | "LUXURY_BUYER" | "FAMILY_UPGRADER" | null;
  intentSignals: {
    vastu: boolean;
    nri: boolean;
    wfh: boolean;
    investment: boolean;
    familyNeeds: boolean;
    relocation: boolean;
  };
  extractedName: string | null;
}

export async function detectIntent(text: string, platform: string): Promise<DetectedIntent> {
  return claudeJSON<DetectedIntent>(`
Analyze this ${platform} post for real estate buying intent in Hyderabad, India.

Post: "${text}"

Hyderabad areas to look for: Gachibowli, Kondapur, Madhapur, HITEC City, Kokapet, Narsingi, Financial District, Tellapur, Kollur, Shamshabad, Adibatla, Kompally, Medchal, Miyapur, Kukatpally, Manikonda, Puppalaguda, Bachupally, Patancheru, Jubilee Hills, Banjara Hills.

Return JSON:
{
  "isPropertySeeker": true/false,
  "confidence": 0.0-1.0,
  "budget": { "min": number|null, "max": number|null, "raw": "original text or null" },
  "preferredAreas": ["area1", "area2"],
  "propertyType": "2BHK"|"3BHK"|"villa"|"plot"|"independent house"|null,
  "timeline": "raw timeline text or null",
  "persona": "IT_PROFESSIONAL"|"NRI"|"FIRST_TIME_BUYER"|"INVESTOR"|"LUXURY_BUYER"|"FAMILY_UPGRADER"|null,
  "intentSignals": { "vastu": bool, "nri": bool, "wfh": bool, "investment": bool, "familyNeeds": bool, "relocation": bool },
  "extractedName": "name if visible or null"
}
`);
}
