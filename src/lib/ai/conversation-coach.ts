import { claude } from "@/lib/claude";

const HYDERABAD_SYSTEM = `You are an expert real estate sales coach specializing in Hyderabad, India.

Key Hyderabad micro-markets:
- IT Corridor (West): Gachibowli, HITEC City, Madhapur, Kondapur, Nanakramguda, Financial District — tech professionals, ₹80L-2Cr+
- Emerging West: Kokapet, Narsingi, Tellapur, Kollur, Mokila — new launches, ₹50L-1.5Cr
- Premium: Jubilee Hills, Banjara Hills — luxury, ₹2Cr-10Cr+
- North Growth: Kompally, Medchal, Bachupally, Miyapur, Nizampet, Pragathi Nagar — affordable, ₹40-80L
- East: Uppal, LB Nagar, Pocharam — industrial corridor, ₹35-65L
- South: Shamshabad, Adibatla, Shadnagar — airport corridor, ₹30-60L
- Central: Secunderabad, Begumpet, Ameerpet — established, ₹70L-1.5Cr
- Micro-markets near Financial District: Nanakramguda, Khajaguda, Gandipet, Gopanpally, Nallagandla, Manikonda, Puppalaguda

Cultural nuances you MUST incorporate:
- Vastu compliance is critical for Telugu buyers — always mention if applicable
- Family-oriented framing: schools, hospitals, parks, community living
- NRI buyers need: virtual site visits, POA help, rental yield data, RERA assurance
- IT professionals care about: proximity to tech parks, traffic-free commute, gated communities
- Telugu rapport: suggest outreach in Telugu for local buyers (massive trust signal)
- Avoid hard-sell: transparent, educational conversations build trust
- Larger homes trending: many upgrading 2BHK→3BHK
- Always mention RERA number and HMDA approval status

Communication style: Warm, professional, consultative. Not pushy.`;

export async function generatePlaybook(input: {
  leadProfile: string;
  matchedProperty: string;
  conversationHistory?: string;
}): Promise<string> {
  return claude(
    `Generate a complete conversation playbook for this lead.

Lead Profile: ${input.leadProfile}
Matched Property: ${input.matchedProperty}
${input.conversationHistory ? `Previous conversation:\n${input.conversationHistory}` : ""}

Include:
1. Ice-breaker message (culturally appropriate, reference their original post/query)
2. Key talking points (specific to their persona)
3. Property pitch (highlighting USPs relevant to THIS buyer)
4. Objection handling scripts (top 3 likely objections)
5. Follow-up schedule (7-day plan)
6. WhatsApp message templates (ready to copy-paste)
7. Telugu greeting option if buyer seems local`,
    HYDERABAD_SYSTEM
  );
}

export async function analyzeConversation(
  conversation: string,
  context?: {
    lead?: { name: string | null; score: number; tier: string; budget: string | null; budgetMin: number | null; budgetMax: number | null; preferredArea: string[]; buyerPersona: string | null; timeline: string | null; intentSignals: any; propertyType: string | null };
    properties?: { name: string; area: string; priceRange: string; unitTypes: any; amenities: string[]; usps: string[]; reraNumber: string | null }[];
  }
): Promise<string> {
  let leadContext = "";
  if (context?.lead) {
    const l = context.lead;
    leadContext = `\n\nLead Profile:
- Name: ${l.name ?? "Unknown"}
- Score: ${l.score}/100 (${l.tier})
- Budget: ${l.budget ?? "not specified"}${l.budgetMin || l.budgetMax ? ` (₹${l.budgetMin ? (l.budgetMin / 100000).toFixed(0) + "L" : "?"} - ₹${l.budgetMax ? (l.budgetMax / 100000).toFixed(0) + "L" : "?"})` : ""}
- Preferred Areas: ${l.preferredArea?.length ? l.preferredArea.join(", ") : "not specified"}
- Property Type: ${l.propertyType ?? "any"}
- Persona: ${l.buyerPersona?.replace(/_/g, " ") ?? "unknown"}
- Timeline: ${l.timeline ?? "not specified"}
- Intent Signals: ${JSON.stringify(l.intentSignals ?? {})}`;
  }

  let propertyContext = "";
  if (context?.properties?.length) {
    propertyContext = `\n\nBroker's Property Inventory:\n${context.properties.map((p, i) => `${i + 1}. ${p.name} (${p.area}) — ${p.priceRange} | RERA: ${p.reraNumber ?? "N/A"} | Units: ${JSON.stringify(p.unitTypes)} | Amenities: ${p.amenities.join(", ")} | USPs: ${p.usps.join(", ")}`).join("\n")}`;
  }

  return claude(
    `Analyze this real estate sales conversation and provide coaching:

${conversation}${leadContext}${propertyContext}

Provide:
1. What's going well
2. Missed opportunities${context?.properties?.length ? " (reference specific properties from inventory if relevant)" : ""}
3. Suggested next message (ready to send)${context?.lead ? ` — personalized for this ${context.lead.buyerPersona?.replace(/_/g, " ") ?? "buyer"}` : ""}
4. Objection handling if any objection was raised
5. Recommended next steps${context?.properties?.length ? " (suggest specific properties to pitch)" : ""}
6. Score the sales approach (1-10)`,
    HYDERABAD_SYSTEM
  );
}

export async function generateOutreachMessage(input: {
  persona: string;
  property: string;
  channel: "whatsapp" | "email" | "sms";
  stage: string;
  leadName?: string;
  propertyDetails?: { name: string; area: string; priceRange: string; unitTypes: any; amenities: string[]; usps: string[]; reraNumber: string | null };
}): Promise<string> {
  let propertyInfo = input.property;
  if (input.propertyDetails) {
    const p = input.propertyDetails;
    propertyInfo = `${p.name} in ${p.area} (${p.priceRange}) — RERA: ${p.reraNumber ?? "N/A"}, Units: ${JSON.stringify(p.unitTypes)}, Amenities: ${p.amenities.slice(0, 8).join(", ")}, USPs: ${p.usps.slice(0, 5).join(", ")}`;
  }

  return claude(
    `Generate a ${input.channel} message for a ${input.persona}${input.leadName ? ` named ${input.leadName}` : ""} about ${propertyInfo}.
Stage: ${input.stage}
Keep it: personal, warm, non-pushy, with clear CTA.
For WhatsApp: under 200 words, include emoji sparingly.
For email: include subject line.
For SMS: under 160 chars.
${input.propertyDetails ? "Use the specific property details provided (mention RERA number, key amenities, relevant USPs for this persona)." : ""}`,
    HYDERABAD_SYSTEM
  );
}
