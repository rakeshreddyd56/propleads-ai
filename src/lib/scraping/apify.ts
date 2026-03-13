// Apify REST API client — uses fetch instead of apify-client SDK
// (SDK has dynamic require() that breaks Vercel's Turbopack bundler)

const APIFY_BASE = "https://api.apify.com/v2";

function getToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN not configured");
  return token;
}

export async function runApifyActor(
  actorId: string,
  input: Record<string, any>,
  timeoutSecs = 120
): Promise<any[]> {
  const token = getToken();

  // Start the actor run
  const runRes = await fetch(
    `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs?token=${token}&timeout=${timeoutSecs}&memory=256`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!runRes.ok) {
    const err = await runRes.text();
    throw new Error(`Apify actor ${actorId} failed to start: ${runRes.status} ${err}`);
  }

  const run = await runRes.json();
  const runId = run.data?.id;
  if (!runId) throw new Error(`Apify actor ${actorId} returned no run ID`);

  // Wait for the run to finish (poll every 3s, max timeoutSecs)
  const startTime = Date.now();
  let status = run.data?.status;

  while (status === "RUNNING" || status === "READY") {
    if (Date.now() - startTime > timeoutSecs * 1000) {
      throw new Error(`Apify actor ${actorId} timed out after ${timeoutSecs}s`);
    }

    await new Promise((r) => setTimeout(r, 3000));

    const statusRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`);
    if (!statusRes.ok) break;
    const statusData = await statusRes.json();
    status = statusData.data?.status;
  }

  if (status !== "SUCCEEDED") {
    throw new Error(`Apify actor ${actorId} ended with status: ${status}`);
  }

  // Fetch dataset items
  const datasetId = run.data?.defaultDatasetId;
  if (!datasetId) throw new Error(`Apify actor ${actorId} produced no dataset`);

  const dataRes = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${token}&limit=100&format=json`
  );

  if (!dataRes.ok) {
    throw new Error(`Failed to fetch Apify dataset: ${dataRes.status}`);
  }

  return dataRes.json();
}

// Updated actor IDs based on latest Apify marketplace (2026)
export const APIFY_ACTORS = {
  NINETY_NINE_ACRES: "easyapi/99acres-com-scraper",
  MAGICBRICKS: "ecomscrape/magicbricks-property-search-scraper",
  NOBROKER: "ecomscrape/nobroker-property-search-scraper",
  FACEBOOK_GROUPS: "apify/facebook-groups-scraper",
  GOOGLE_MAPS: "compass/crawler-google-places",
  INSTAGRAM: "apify/instagram-scraper",
  TWITTER: "apidojo/tweet-scraper",
  YOUTUBE_COMMENTS: "streamers/youtube-comments-scraper",
  LINKEDIN: "dev_fusion/linkedin-profile-scraper",
  QUORA: "jupri/quora-scraper",
  TELEGRAM: "tri_angle/telegram-scraper",
} as const;
