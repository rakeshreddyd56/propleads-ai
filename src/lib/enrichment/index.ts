/**
 * Contact enrichment orchestrator — Pro tier only.
 *
 * Strategy:
 * 1. If lead has LinkedIn URL → Apollo enrichFromLinkedIn (best path)
 * 2. If lead has email → Apollo enrichFromEmail (second best)
 * 3. If lead has real name → Apollo searchPerson by name + Hyderabad
 * 4. If Apollo found company → Hunter findEmail for verification
 * 5. If any email found → Hunter verifyEmail
 *
 * Updates lead record with enriched contact info.
 */

import { db } from "@/lib/db";
import { isApolloConfigured, searchPerson, enrichFromLinkedIn, enrichFromEmail, type ApolloContact } from "./apollo";
import { isHunterConfigured, findEmail, verifyEmail } from "./hunter";
import { enrichLinkedInProfiles } from "@/lib/scraping/platforms/linkedin";

export interface EnrichmentResult {
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  linkedinUrl: string | null;
  source: string; // "apollo" | "hunter" | "apify_linkedin" | "none"
}

/**
 * Enrich a single lead with contact information.
 * Tries multiple strategies in priority order.
 */
export async function enrichLead(leadId: string): Promise<EnrichmentResult> {
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead not found");

  const result: EnrichmentResult = {
    email: lead.email || null,
    emailVerified: false,
    phone: lead.phone || null,
    company: null,
    jobTitle: null,
    linkedinUrl: lead.profileUrl?.includes("linkedin.com") ? lead.profileUrl : null,
    source: "none",
  };

  // Strategy 1: LinkedIn URL enrichment via Apollo
  if (isApolloConfigured() && result.linkedinUrl) {
    const contact = await enrichFromLinkedIn(result.linkedinUrl);
    if (contact) {
      mergeContact(result, contact, "apollo");
    }
  }

  // Strategy 2: LinkedIn URL enrichment via Apify (no cookies needed)
  if (!result.email && result.linkedinUrl) {
    try {
      const profiles = await enrichLinkedInProfiles([result.linkedinUrl]);
      if (profiles.length > 0) {
        const p = profiles[0];
        if (p.email) result.email = p.email;
        if (p.phone && !result.phone) result.phone = p.phone;
        if (p.company && !result.company) result.company = p.company;
        if (p.title && !result.jobTitle) result.jobTitle = p.title;
        if (result.source === "none") result.source = "apify_linkedin";
      }
    } catch (e) {
      console.warn("Apify LinkedIn enrichment failed:", e);
    }
  }

  // Strategy 3: Apollo search by email (if we have one from profile)
  if (isApolloConfigured() && result.email && !result.company) {
    const contact = await enrichFromEmail(result.email);
    if (contact) mergeContact(result, contact, "apollo");
  }

  // Strategy 4: Apollo search by name + location
  if (isApolloConfigured() && !result.email && lead.name && lead.name !== "unknown") {
    const contact = await searchPerson(lead.name, "Hyderabad, India");
    if (contact) mergeContact(result, contact, "apollo");
  }

  // Strategy 5: Hunter email finder (if we have company domain)
  if (isHunterConfigured() && !result.email && result.company && lead.name) {
    const domain = guessCompanyDomain(result.company);
    if (domain) {
      const hunterResult = await findEmail(lead.name, domain);
      if (hunterResult?.email) {
        result.email = hunterResult.email;
        if (!result.jobTitle && hunterResult.position) result.jobTitle = hunterResult.position;
        result.source = "hunter";
      }
    }
  }

  // Strategy 6: Verify email if we found one
  if (isHunterConfigured() && result.email) {
    const verification = await verifyEmail(result.email);
    result.emailVerified = verification?.result === "deliverable";
  }

  // Update lead record
  await db.lead.update({
    where: { id: leadId },
    data: {
      email: result.email || lead.email,
      phone: result.phone || lead.phone,
      company: result.company,
      jobTitle: result.jobTitle,
      enrichedData: {
        ...((lead.enrichedData as any) || {}),
        email: result.email,
        emailVerified: result.emailVerified,
        phone: result.phone,
        company: result.company,
        jobTitle: result.jobTitle,
        linkedinUrl: result.linkedinUrl,
      },
      enrichedAt: new Date(),
      enrichmentSource: result.source,
    },
  });

  return result;
}

/**
 * Batch-enrich all unenriched HOT leads for an org.
 * Pro tier only. Max 10 per batch to stay within API limits.
 */
export async function enrichHotLeads(orgId: string): Promise<{
  enriched: number;
  found: number;
  total: number;
}> {
  const leads = await db.lead.findMany({
    where: {
      orgId,
      tier: "HOT",
      enrichedAt: null,
    },
    take: 10,
    orderBy: { score: "desc" },
  });

  let found = 0;
  for (const lead of leads) {
    try {
      const result = await enrichLead(lead.id);
      if (result.email || result.phone) found++;
    } catch (e) {
      console.warn(`Enrichment failed for lead ${lead.id}:`, e);
    }
  }

  const totalUnenriched = await db.lead.count({
    where: { orgId, tier: "HOT", enrichedAt: null },
  });

  return {
    enriched: leads.length,
    found,
    total: totalUnenriched,
  };
}

function mergeContact(result: EnrichmentResult, contact: ApolloContact, source: string) {
  if (contact.email && !result.email) result.email = contact.email;
  if (contact.phone && !result.phone) result.phone = contact.phone;
  if (contact.company && !result.company) result.company = contact.company;
  if (contact.jobTitle && !result.jobTitle) result.jobTitle = contact.jobTitle;
  if (contact.linkedinUrl && !result.linkedinUrl) result.linkedinUrl = contact.linkedinUrl;
  if (result.source === "none") result.source = source;
}

function guessCompanyDomain(company: string): string | null {
  // Common Indian IT companies
  const known: Record<string, string> = {
    infosys: "infosys.com", tcs: "tcs.com", wipro: "wipro.com",
    "hcl technologies": "hcltech.com", "tech mahindra": "techmahindra.com",
    cognizant: "cognizant.com", accenture: "accenture.com",
    deloitte: "deloitte.com", capgemini: "capgemini.com",
    amazon: "amazon.com", google: "google.com", microsoft: "microsoft.com",
    apple: "apple.com", meta: "meta.com", qualcomm: "qualcomm.com",
  };

  const lower = company.toLowerCase().trim();
  if (known[lower]) return known[lower];

  // Simple domain guess: remove spaces, add .com
  const cleaned = lower.replace(/\s+(?:pvt\.?|ltd\.?|limited|inc\.?|technologies|tech|solutions)/gi, "");
  if (cleaned.length > 2) return `${cleaned.replace(/\s+/g, "")}.com`;
  return null;
}
