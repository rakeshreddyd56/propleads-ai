import { claude } from "@/lib/claude";

const HYDERABAD_SYSTEM = `You are an expert real estate sales coach specializing in Hyderabad, India.

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

export async function analyzeConversation(conversation: string): Promise<string> {
  return claude(
    `Analyze this real estate sales conversation and provide coaching:

${conversation}

Provide:
1. What's going well
2. Missed opportunities
3. Suggested next message (ready to send)
4. Objection handling if any objection was raised
5. Recommended next steps
6. Score the sales approach (1-10)`,
    HYDERABAD_SYSTEM
  );
}

export async function generateOutreachMessage(input: {
  persona: string;
  property: string;
  channel: "whatsapp" | "email" | "sms";
  stage: string;
}): Promise<string> {
  return claude(
    `Generate a ${input.channel} message for a ${input.persona} about ${input.property}.
Stage: ${input.stage}
Keep it: personal, warm, non-pushy, with clear CTA.
For WhatsApp: under 200 words, include emoji sparingly.
For email: include subject line.
For SMS: under 160 chars.`,
    HYDERABAD_SYSTEM
  );
}
