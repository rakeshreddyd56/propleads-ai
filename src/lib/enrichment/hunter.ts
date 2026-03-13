/**
 * Hunter.io API client — email finding and verification.
 *
 * Capabilities:
 * - Find email by name + company domain
 * - Verify if an email is deliverable
 *
 * API: https://api.hunter.io/v2/
 * Pricing: Free = 25 searches/mo + 50 verifications/mo
 * Set HUNTER_API_KEY in environment.
 */

const HUNTER_BASE = "https://api.hunter.io/v2";

function getApiKey(): string | null {
  const key = process.env.HUNTER_API_KEY;
  return key && key.length > 5 ? key : null;
}

export function isHunterConfigured(): boolean {
  return !!getApiKey();
}

export interface HunterEmailResult {
  email: string;
  score: number; // 0-100 confidence
  position: string | null;
  company: string | null;
  sources: number;
}

/**
 * Find email for a person at a company domain.
 * Input: full name + company domain (e.g., "John Doe", "infosys.com")
 */
export async function findEmail(
  fullName: string,
  domain: string
): Promise<HunterEmailResult | null> {
  const apiKey = getApiKey();
  if (!apiKey || !fullName || !domain) return null;

  try {
    const params = new URLSearchParams({
      domain,
      full_name: fullName,
      api_key: apiKey,
    });

    const res = await fetch(`${HUNTER_BASE}/email-finder?${params}`);
    if (!res.ok) {
      console.warn(`Hunter email-finder failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const result = data.data;
    if (!result?.email) return null;

    return {
      email: result.email,
      score: result.score ?? 0,
      position: result.position ?? null,
      company: result.company ?? domain,
      sources: result.sources ?? 0,
    };
  } catch (e) {
    console.warn("Hunter email-finder error:", e);
    return null;
  }
}

export interface HunterVerification {
  email: string;
  result: "deliverable" | "undeliverable" | "risky" | "unknown";
  score: number;
  mxRecords: boolean;
}

/**
 * Verify if an email address is deliverable.
 * Use after finding an email to confirm it's valid before outreach.
 */
export async function verifyEmail(
  email: string
): Promise<HunterVerification | null> {
  const apiKey = getApiKey();
  if (!apiKey || !email?.includes("@")) return null;

  try {
    const params = new URLSearchParams({
      email,
      api_key: apiKey,
    });

    const res = await fetch(`${HUNTER_BASE}/email-verifier?${params}`);
    if (!res.ok) return null;

    const data = await res.json();
    const result = data.data;
    if (!result) return null;

    return {
      email: result.email,
      result: result.result ?? "unknown",
      score: result.score ?? 0,
      mxRecords: result.mx_records ?? false,
    };
  } catch (e) {
    console.warn("Hunter verify error:", e);
    return null;
  }
}
