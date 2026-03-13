/**
 * Apify REST API client — production-grade integration.
 * Uses fetch (no SDK) to avoid Turbopack bundler issues.
 *
 * Each actor has verified input format + per-actor timeout.
 * Primary scraping strategy for STARTER+ tiers.
 */

const APIFY_BASE = "https://api.apify.com/v2";

function getToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN not configured");
  return token;
}

export function isApifyConfigured(): boolean {
  return !!process.env.APIFY_API_TOKEN;
}

// ---- Verified Actor IDs (confirmed via API 2026-03-12) ----

export const APIFY_ACTORS = {
  // Property Portals (monthly rental — Starter+)
  NINETY_NINE_ACRES: "easyapi/99acres-com-scraper",
  MAGICBRICKS: "ecomscrape/magicbricks-property-search-scraper",
  NOBROKER: "ecomscrape/nobroker-property-search-scraper",

  // Social Media (pay-per-event — Growth+)
  INSTAGRAM: "apify/instagram-scraper",
  TWITTER: "apidojo/tweet-scraper",
  YOUTUBE_COMMENTS: "streamers/youtube-comments-scraper",
  FACEBOOK_GROUPS: "apify/facebook-groups-scraper",
  FACEBOOK_POSTS: "apify/facebook-posts-scraper",
  TELEGRAM: "tri_angle/telegram-scraper",

  // Professional / Q&A (Growth+)
  LINKEDIN: "dev_fusion/linkedin-profile-scraper",
  QUORA: "jupri/quora-scraper",

  // Local (Growth+)
  GOOGLE_MAPS: "compass/crawler-google-places",
} as const;

// Per-actor timeout configs (seconds)
const ACTOR_TIMEOUTS: Record<string, number> = {
  [APIFY_ACTORS.GOOGLE_MAPS]: 180,
  [APIFY_ACTORS.FACEBOOK_GROUPS]: 120,
  [APIFY_ACTORS.INSTAGRAM]: 120,
  [APIFY_ACTORS.LINKEDIN]: 120,
  [APIFY_ACTORS.TWITTER]: 90,
  [APIFY_ACTORS.YOUTUBE_COMMENTS]: 90,
  [APIFY_ACTORS.TELEGRAM]: 60,
  [APIFY_ACTORS.QUORA]: 90,
  [APIFY_ACTORS.NINETY_NINE_ACRES]: 120,
  [APIFY_ACTORS.MAGICBRICKS]: 120,
  [APIFY_ACTORS.NOBROKER]: 120,
};

// ---- Core API Functions ----

/**
 * Run an Apify actor synchronously — starts the run and waits for completion.
 * Returns the dataset items as an array.
 */
export async function runApifyActor(
  actorId: string,
  input: Record<string, any>,
  options?: { timeoutSecs?: number; maxItems?: number; memoryMbytes?: number }
): Promise<any[]> {
  const token = getToken();
  const timeout = options?.timeoutSecs ?? ACTOR_TIMEOUTS[actorId] ?? 90;
  const memory = options?.memoryMbytes ?? 512;

  // Start the actor run and wait for finish
  const actorPath = actorId.replace("/", "~");
  const runRes = await fetch(
    `${APIFY_BASE}/acts/${actorPath}/runs?token=${token}&timeout=${timeout}&memory=${memory}&waitForFinish=${timeout}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!runRes.ok) {
    const errText = await runRes.text();
    // Check for rental required error
    if (errText.includes("actor-is-not-rented")) {
      throw new ApifyRentalError(actorId);
    }
    throw new Error(`Apify ${actorId}: start failed (${runRes.status}): ${errText.slice(0, 200)}`);
  }

  const run = await runRes.json();
  const runData = run.data;
  if (!runData?.id) throw new Error(`Apify ${actorId}: no run ID returned`);

  // If waitForFinish didn't complete, poll
  let status = runData.status;
  if (status === "RUNNING" || status === "READY") {
    status = await pollRunStatus(runData.id, token, timeout);
  }

  if (status !== "SUCCEEDED") {
    throw new Error(`Apify ${actorId}: run ${status} (runId: ${runData.id})`);
  }

  // Fetch dataset items
  const datasetId = runData.defaultDatasetId;
  if (!datasetId) return [];

  const limit = options?.maxItems ?? 100;
  const dataRes = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&limit=${limit}&format=json`
  );

  if (!dataRes.ok) {
    throw new Error(`Apify dataset fetch failed: ${dataRes.status}`);
  }

  const items = await dataRes.json();
  return Array.isArray(items) ? items : [];
}

/**
 * Poll a run until it finishes or times out.
 */
async function pollRunStatus(runId: string, token: string, timeoutSecs: number): Promise<string> {
  const startTime = Date.now();
  const maxMs = timeoutSecs * 1000;

  while (Date.now() - startTime < maxMs) {
    await new Promise((r) => setTimeout(r, 3000));

    const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`);
    if (!res.ok) continue;

    const data = await res.json();
    const status = data.data?.status;
    if (status !== "RUNNING" && status !== "READY") return status;
  }

  return "TIMED-OUT";
}

/**
 * Custom error for actors that need monthly rental.
 * The scraper should fall back to Firecrawl when this is thrown.
 */
export class ApifyRentalError extends Error {
  constructor(actorId: string) {
    super(`Apify actor ${actorId} requires a paid rental. Falling back to web search.`);
    this.name = "ApifyRentalError";
  }
}

// ---- Input Formatters (per-actor) ----

export function formatInstagramInput(identifier: string, limit: number) {
  const cleanId = identifier.replace(/^[#@]/, "");
  // Detect if it's a hashtag or username
  if (identifier.startsWith("#") || !identifier.includes("/")) {
    return {
      hashtags: [cleanId],
      resultsLimit: limit,
      searchType: "hashtag",
    };
  }
  return {
    usernames: [cleanId],
    resultsLimit: limit,
    searchType: "user",
  };
}

export function formatTwitterInput(query: string, keywords: string[], limit: number) {
  const searchQuery = keywords.length > 0
    ? `${query} ${keywords.slice(0, 3).join(" ")}`
    : query;
  return {
    startUrls: [{ url: `https://x.com/search?q=${encodeURIComponent(searchQuery)}&f=live` }],
    maxItems: limit,
    sort: "Latest",
  };
}

export function formatGoogleMapsInput(query: string, city: string, limit: number) {
  return {
    searchStringsArray: [`${query} ${city}`],
    maxCrawledPlacesPerSearch: limit,
    language: "en",
    maxReviews: 5,
    proxyConfig: { useApifyProxy: true },
  };
}

export function formatFacebookGroupInput(groupId: string, limit: number) {
  // groupId can be a name or numeric ID
  const url = groupId.match(/^\d+$/)
    ? `https://www.facebook.com/groups/${groupId}`
    : `https://www.facebook.com/groups/${groupId}`;
  return {
    startUrls: [{ url }],
    maxPosts: limit,
    maxComments: 10,
  };
}

export function formatYouTubeCommentsInput(query: string, limit: number) {
  return {
    startUrls: [{ url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}` }],
    maxComments: limit,
    maxReplies: 3,
  };
}

export function formatTelegramInput(channelId: string, limit: number) {
  return {
    channelUsernames: [channelId.replace(/^@/, "")],
    maxMessages: limit,
  };
}

export function formatLinkedInInput(profileUrls: string[]) {
  return {
    profileUrls: profileUrls.map((url) => ({ url })),
  };
}

export function formatQuoraInput(query: string, limit: number) {
  return {
    searchQuery: query,
    maxQuestions: limit,
  };
}

export function format99AcresInput(city: string, keywords: string[], limit: number) {
  const kw = keywords.slice(0, 2).join(" ");
  return {
    startUrls: [{
      url: `https://www.99acres.com/search/property/buy/${city.toLowerCase()}?city=30&preference=S&area_unit=1&res_com=R`,
    }],
    maxItems: limit,
    keyword: kw || undefined,
  };
}

export function formatMagicBricksInput(city: string, keywords: string[], limit: number) {
  return {
    startUrls: [{
      url: `https://www.magicbricks.com/property-for-sale/residential-real-estate?bedroom=&proptype=Multistorey-Apartment,Builder-Floor-Apartment,Penthouse,Studio-Apartment,Residential-House,Villa&cityName=${city}`,
    }],
    maxItems: limit,
  };
}

export function formatNoBrokerInput(city: string, keywords: string[], limit: number) {
  return {
    startUrls: [{
      url: `https://www.nobroker.in/property/sale/${city.toLowerCase()}/${city}?searchParam=W3sibGF0IjoiMTcuMzg1MDQ0IiwibG9uIjoiNzguNDg2NjcxIiwicGxhY2VJZCI6IkNoSUpxNHAxdUFfTnlqc1I0bUdOaVM5Z2tKWSIsInBsYWNlTmFtZSI6Ikh5ZGVyYWJhZCJ9XQ==&orderBy=rent&orderType=asc`,
    }],
    maxItems: limit,
  };
}
