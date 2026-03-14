import { claudeJSON, claudeJSONFast } from "@/lib/claude";

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

const platformPrompts: Record<string, string> = {
  REDDIT: "This is a Reddit post. Look for people asking about buying/renting flats, apartments, or properties. Posts asking for recommendations, budget advice, or area suggestions indicate strong intent.",
  FACEBOOK: "This is a Facebook Group post. Property groups often have direct buy/sell intent. Look for requirement posts, budget mentions, and area preferences.",
  NINETY_NINE_ACRES: "This is a 99acres property listing. Determine if this is a BUYER requirement/wanted post (high intent) or a seller listing (lower intent). Buyer posts are more valuable as leads.",
  MAGICBRICKS: "This is a MagicBricks listing. Focus on buyer inquiries and requirement posts rather than seller listings.",
  NOBROKER: "This is from NoBroker (direct owner platform). Posts here are high-intent — people are actively looking to buy/rent without brokers.",
  GOOGLE_MAPS: "This is a Google Maps review of a real estate agent/builder. Look for reviewers who mention actively searching for property.",
  INSTAGRAM: "This is an Instagram post/comment about real estate. Comments asking about prices, availability, or visits indicate buyer intent.",
  TWITTER: "This is a tweet about real estate. Look for people expressing intent to buy, invest, or relocate.",
  YOUTUBE: "This is a YouTube comment on a property video. Comments asking about pricing, availability, site visits, or loans indicate strong buyer intent.",
  LINKEDIN: "This is a LinkedIn post. Professionals posting about property needs, relocating for work, or investment discussions are valuable leads.",
  QUORA: "This is a Quora question about real estate. People asking 'where should I buy' or 'is X a good area' are high-intent prospects.",
  TELEGRAM: "This is a Telegram group message about real estate. Direct requirement posts with budget and area preferences indicate strong intent.",
  COMMONFLOOR: "This is a CommonFloor forum post from a housing society. Residents asking about buying nearby or upgrading are potential leads.",
};

export async function detectIntent(text: string, platform: string): Promise<DetectedIntent> {
  const platformHint = platformPrompts[platform] ?? `This is from the ${platform} platform.`;

  return claudeJSON<DetectedIntent>(`
Analyze this post for real estate BUYING intent in Hyderabad, India.

${platformHint}

Post: "${text.slice(0, 3000)}"

Hyderabad areas to look for: Gachibowli, Kondapur, Madhapur, HITEC City, Kokapet, Narsingi, Financial District, Tellapur, Kollur, Shamshabad, Adibatla, Kompally, Medchal, Miyapur, Kukatpally, Manikonda, Puppalaguda, Bachupally, Patancheru, Jubilee Hills, Banjara Hills, Uppal, LB Nagar, Secunderabad, Begumpet, Ameerpet, Tolichowki, Nallagandla, Gopanpally, Lingampally, Nizampet, Pragathi Nagar, Chandanagar, Rajendra Nagar, Attapur, Mehdipatnam, Nanakramguda, Khajaguda, Gandipet, Shadnagar, Dundigal, Appa Junction.

Budget conversion: 1L = 1 lakh = 100,000 INR, 1Cr = 1 crore = 10,000,000 INR

Return JSON:
{
  "isPropertySeeker": true/false (true if this person wants to BUY or RENT a property),
  "confidence": 0.0-1.0 (how confident are you this is a genuine property seeker),
  "budget": { "min": number|null (in INR), "max": number|null (in INR), "raw": "original budget text or null" },
  "preferredAreas": ["area1", "area2"],
  "propertyType": "2BHK"|"3BHK"|"4BHK"|"villa"|"plot"|"independent house"|"penthouse"|"studio"|null,
  "timeline": "raw timeline text or null",
  "persona": "IT_PROFESSIONAL"|"NRI"|"FIRST_TIME_BUYER"|"INVESTOR"|"LUXURY_BUYER"|"FAMILY_UPGRADER"|null,
  "intentSignals": { "vastu": bool, "nri": bool, "wfh": bool, "investment": bool, "familyNeeds": bool, "relocation": bool },
  "extractedName": "name if visible or null"
}
`);
}

/** Fast version using Haiku — for bulk scraping within timeout */
export async function detectIntentFast(text: string, platform: string): Promise<DetectedIntent> {
  const platformHint = platformPrompts[platform] ?? `This is from the ${platform} platform.`;

  return claudeJSONFast<DetectedIntent>(`
Analyze this post for real estate BUYING intent in Hyderabad, India.

${platformHint}

Post: "${text.slice(0, 2000)}"

Areas: Gachibowli, Kondapur, Madhapur, HITEC City, Kokapet, Narsingi, Financial District, Tellapur, Kollur, Shamshabad, Kompally, Miyapur, Kukatpally, Manikonda, Bachupally, Jubilee Hills, Banjara Hills, Uppal, LB Nagar, Secunderabad, Begumpet, Ameerpet, Tolichowki, Nallagandla, Gopanpally, Lingampally, Nizampet, Pragathi Nagar, Chandanagar, Rajendra Nagar, Attapur, Mehdipatnam, Adibatla, Medchal, Patancheru, Puppalaguda, Nanakramguda, Khajaguda, Gandipet, Shadnagar, Dundigal, Appa Junction.

Budget: 1L = 100,000 INR, 1Cr = 10,000,000 INR

Return JSON:
{
  "isPropertySeeker": true/false,
  "confidence": 0.0-1.0,
  "budget": { "min": number|null, "max": number|null, "raw": "text or null" },
  "preferredAreas": ["area1"],
  "propertyType": "2BHK"|"3BHK"|"villa"|null,
  "timeline": "text or null",
  "persona": "IT_PROFESSIONAL"|"NRI"|"FIRST_TIME_BUYER"|"INVESTOR"|"LUXURY_BUYER"|"FAMILY_UPGRADER"|null,
  "intentSignals": { "vastu": false, "nri": false, "wfh": false, "investment": false, "familyNeeds": false, "relocation": false },
  "extractedName": "name or null"
}
`);
}
