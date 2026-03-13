/**
 * SerpAPI client — structured Google Search results.
 * Used by Growth+ tiers for enhanced real-time search capabilities.
 *
 * Endpoints:
 * - Google Search: find buyer intent posts across the web
 * - Google Maps: find real estate agents/builders with reviews
 * - Google News: real estate market trends and developer announcements
 *
 * Pricing: ~$50/mo for 5000 searches, or free tier (100/mo).
 * Set SERPAPI_API_KEY in environment.
 */

const SERPAPI_BASE = "https://serpapi.com/search";

function getApiKey(): string | null {
  return process.env.SERPAPI_API_KEY || null;
}

export function isSerpApiConfigured(): boolean {
  return !!process.env.SERPAPI_API_KEY;
}

interface SerpApiOptions {
  num?: number;
  gl?: string;   // country (default: "in" for India)
  hl?: string;   // language (default: "en")
  location?: string;
}

// ---- Google Search ----

export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
  date?: string;
}

/**
 * Google Search via SerpAPI — returns structured results with snippets.
 * Much better than Firecrawl for targeted queries because:
 * 1. Returns structured data (no markdown parsing needed)
 * 2. Includes date, source, snippet
 * 3. Supports location-specific results
 */
export async function searchGoogle(
  query: string,
  options?: SerpApiOptions
): Promise<GoogleSearchResult[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const params = new URLSearchParams({
    api_key: apiKey,
    engine: "google",
    q: query,
    gl: options?.gl ?? "in",
    hl: options?.hl ?? "en",
    num: String(options?.num ?? 10),
    ...(options?.location && { location: options.location }),
  });

  const res = await fetch(`${SERPAPI_BASE}?${params}`);
  if (!res.ok) {
    console.warn(`SerpAPI search failed: ${res.status}`);
    return [];
  }

  const data = await res.json();
  const organicResults = data.organic_results ?? [];

  return organicResults.map((r: any) => ({
    title: r.title ?? "",
    link: r.link ?? "",
    snippet: r.snippet ?? "",
    source: r.source ?? r.displayed_link ?? "",
    date: r.date ?? undefined,
  }));
}

// ---- Google Maps ----

export interface GoogleMapsResult {
  title: string;
  placeId: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviews: number;
  type: string;
  gpsCoordinates: { latitude: number; longitude: number } | null;
}

/**
 * Google Maps search via SerpAPI — find real estate businesses.
 * Returns structured business info (phone, website, rating, reviews).
 */
export async function searchGoogleMaps(
  query: string,
  location?: string
): Promise<GoogleMapsResult[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const params = new URLSearchParams({
    api_key: apiKey,
    engine: "google_maps",
    q: query,
    ll: "@17.385044,78.486671,12z", // Hyderabad center, 12z zoom
    ...(location && { location }),
  });

  const res = await fetch(`${SERPAPI_BASE}?${params}`);
  if (!res.ok) return [];

  const data = await res.json();
  const results = data.local_results ?? [];

  return results.map((r: any) => ({
    title: r.title ?? "",
    placeId: r.place_id ?? "",
    address: r.address ?? "",
    phone: r.phone ?? null,
    website: r.website ?? null,
    rating: r.rating ?? null,
    reviews: r.reviews ?? 0,
    type: r.type ?? "",
    gpsCoordinates: r.gps_coordinates ?? null,
  }));
}

// ---- Google News ----

export interface GoogleNewsResult {
  title: string;
  link: string;
  source: string;
  date: string;
  snippet: string;
}

/**
 * Google News via SerpAPI — real estate market trends.
 * Useful for: developer announcements, price trends, new project launches.
 */
export async function searchGoogleNews(
  query: string,
  options?: { num?: number; location?: string }
): Promise<GoogleNewsResult[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const params = new URLSearchParams({
    api_key: apiKey,
    engine: "google",
    q: query,
    tbm: "nws", // news tab
    gl: "in",
    hl: "en",
    num: String(options?.num ?? 10),
  });

  const res = await fetch(`${SERPAPI_BASE}?${params}`);
  if (!res.ok) return [];

  const data = await res.json();
  const results = data.news_results ?? [];

  return results.map((r: any) => ({
    title: r.title ?? "",
    link: r.link ?? "",
    source: r.source?.name ?? r.source ?? "",
    date: r.date ?? "",
    snippet: r.snippet ?? "",
  }));
}

// ---- Real Estate Intent Search ----

/**
 * Search for buyer intent posts across the web.
 * Combines multiple targeted queries for maximum coverage.
 */
export async function searchBuyerIntent(
  areas: string[],
  keywords: string[],
  platforms?: string[]
): Promise<GoogleSearchResult[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const areaStr = areas.slice(0, 3).join(" OR ");
  const kwStr = keywords.slice(0, 3).join(" ");

  // Build platform-specific site filters
  const siteFilter = platforms?.length
    ? platforms.map((p) => `site:${p}`).join(" OR ")
    : "";

  const queries = [
    `"looking to buy" flat apartment (${areaStr}) hyderabad ${siteFilter}`.trim(),
    `"want to buy" property (${areaStr}) ${kwStr} ${siteFilter}`.trim(),
    `"budget" "BHK" hyderabad (${areaStr}) buy ${siteFilter}`.trim(),
  ];

  const allResults: GoogleSearchResult[] = [];
  for (const query of queries) {
    const results = await searchGoogle(query, { num: 5, location: "Hyderabad, Telangana, India" });
    allResults.push(...results);
  }

  // Dedupe by link
  const seen = new Set<string>();
  return allResults.filter((r) => {
    if (seen.has(r.link)) return false;
    seen.add(r.link);
    return true;
  });
}
