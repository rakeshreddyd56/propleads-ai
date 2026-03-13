/**
 * Apollo.io API client — contact enrichment for Pro tier.
 *
 * Capabilities:
 * - People search by name + location (Hyderabad)
 * - Profile enrichment from LinkedIn URL
 * - Enrichment from email address
 * - Returns: email, phone, company, job title
 *
 * API: https://api.apollo.io/api/v1/
 * Pricing: Free tier = 50 credits/mo, paid = $49+/mo
 * Set APOLLO_API_KEY in environment.
 */

const APOLLO_BASE = "https://api.apollo.io/api/v1";

function getApiKey(): string | null {
  const key = process.env.APOLLO_API_KEY;
  return key && key.length > 5 ? key : null;
}

export function isApolloConfigured(): boolean {
  return !!getApiKey();
}

export interface ApolloContact {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  linkedinUrl: string | null;
  location: string | null;
  confidence: number;
}

/**
 * Search for a person by name and location.
 * Best for leads from Reddit/Quora where we only have a display name.
 */
export async function searchPerson(
  name: string,
  location?: string
): Promise<ApolloContact | null> {
  const apiKey = getApiKey();
  if (!apiKey || !name || name === "unknown") return null;

  try {
    const res = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        q_person_name: name,
        person_locations: location ? [location] : ["Hyderabad, India"],
        page: 1,
        per_page: 1,
      }),
    });

    if (!res.ok) {
      console.warn(`Apollo search failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const person = data.people?.[0];
    return person ? mapContact(person) : null;
  } catch (e) {
    console.warn("Apollo search error:", e);
    return null;
  }
}

/**
 * Enrich a person from their LinkedIn URL.
 * Best for leads from LinkedIn posts where we have the profile URL.
 */
export async function enrichFromLinkedIn(
  linkedinUrl: string
): Promise<ApolloContact | null> {
  const apiKey = getApiKey();
  if (!apiKey || !linkedinUrl?.includes("linkedin.com")) return null;

  try {
    const res = await fetch(`${APOLLO_BASE}/people/match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        linkedin_url: linkedinUrl,
        reveal_personal_emails: true,
        reveal_phone_number: true,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.person ? mapContact(data.person) : null;
  } catch (e) {
    console.warn("Apollo LinkedIn enrichment error:", e);
    return null;
  }
}

/**
 * Enrich from email address.
 * Best when we already have an email from another source.
 */
export async function enrichFromEmail(
  email: string
): Promise<ApolloContact | null> {
  const apiKey = getApiKey();
  if (!apiKey || !email?.includes("@")) return null;

  try {
    const res = await fetch(`${APOLLO_BASE}/people/match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        email,
        reveal_phone_number: true,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.person ? mapContact(data.person) : null;
  } catch (e) {
    console.warn("Apollo email enrichment error:", e);
    return null;
  }
}

function mapContact(person: any): ApolloContact {
  return {
    name: [person.first_name, person.last_name].filter(Boolean).join(" ") || person.name || "",
    email: person.email || person.personal_emails?.[0] || null,
    phone: person.phone_numbers?.[0]?.sanitized_number || person.phone_number || null,
    company: person.organization?.name || person.company_name || null,
    jobTitle: person.title || person.headline || null,
    linkedinUrl: person.linkedin_url || null,
    location: [person.city, person.state, person.country].filter(Boolean).join(", ") || null,
    confidence: person.email_status === "verified" ? 0.95
      : person.email_status === "likely" ? 0.7 : 0.5,
  };
}
