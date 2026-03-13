import { searchWeb } from "../firecrawl";
import {
  runApifyActor, APIFY_ACTORS,
  isApifyConfigured,
} from "../apify";

export interface LinkedInPost {
  id: string;
  text: string;
  author: string;
  authorId: string;
  authorTitle: string;
  url: string;
  timestamp: string;
  likes: number;
  comments: number;
}

/**
 * Scrape LinkedIn posts/profiles for real estate buyer intent.
 *
 * Strategy:
 * 1. Apify LinkedIn Profile Scraper — enriches known LinkedIn URLs with email/phone
 * 2. Firecrawl site:linkedin.com/posts search — finds posts by keyword (always runs)
 *
 * The profile scraper is for enrichment (used when we have LinkedIn URLs).
 * For discovery, we use web search to find posts about Hyderabad real estate.
 */
export async function scrapeLinkedIn(
  searchQuery: string,
  keywords: string[],
  limit = 10
): Promise<LinkedInPost[]> {
  // For post discovery, Firecrawl site search is most reliable
  // (LinkedIn's own scraping is heavily rate-limited)
  return scrapeViaFirecrawl(searchQuery, keywords, limit);
}

/**
 * Enrich LinkedIn profile URLs with contact info.
 * Uses Apify dev_fusion/linkedin-profile-scraper (no cookies needed!).
 * Returns name, email, phone, title, company.
 */
export async function enrichLinkedInProfiles(
  profileUrls: string[]
): Promise<LinkedInProfile[]> {
  if (!isApifyConfigured() || profileUrls.length === 0) return [];

  try {
    const items = await runApifyActor(APIFY_ACTORS.LINKEDIN, {
      profileUrls: profileUrls.map((url) => ({ url })),
    }, { maxItems: profileUrls.length, timeoutSecs: 120 });

    return items.map(mapApifyProfile).filter(Boolean) as LinkedInProfile[];
  } catch (e) {
    console.warn("LinkedIn profile enrichment failed:", e);
    return [];
  }
}

export interface LinkedInProfile {
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  linkedinUrl: string;
}

function mapApifyProfile(item: any): LinkedInProfile | null {
  const name = item.fullName || item.name || item.firstName
    ? `${item.firstName || ""} ${item.lastName || ""}`.trim()
    : null;
  if (!name) return null;

  return {
    name,
    email: item.email || item.emails?.[0] || null,
    phone: item.phone || item.phones?.[0] || null,
    title: item.headline || item.title || item.currentPosition || null,
    company: item.company || item.currentCompany || item.companyName || null,
    location: item.location || item.city || null,
    linkedinUrl: item.url || item.profileUrl || item.linkedinUrl || "",
  };
}

async function scrapeViaFirecrawl(searchQuery: string, keywords: string[], limit: number): Promise<LinkedInPost[]> {
  const keywordStr = keywords.length > 0 ? keywords.slice(0, 3).join(" ") : searchQuery;
  const query = `site:linkedin.com/posts ${keywordStr} hyderabad real estate property`.trim();
  const results = await searchWeb(query, limit);

  return results
    .filter((r) => r.url?.includes("linkedin.com"))
    .map((r) => ({
      id: `li-${Buffer.from(r.url).toString("base64").slice(0, 12)}`,
      text: r.markdown?.slice(0, 2000) ?? r.title ?? "",
      author: r.title?.split(" - ")?.[0] ?? "LinkedIn User",
      authorId: r.url,
      authorTitle: "",
      url: r.url,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: 0,
    }));
}
