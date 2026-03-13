import { ApifyClient } from "apify-client";

let _client: ApifyClient | null = null;

function getClient(): ApifyClient {
  if (!_client) {
    if (!process.env.APIFY_API_TOKEN) {
      throw new Error("APIFY_API_TOKEN not configured");
    }
    _client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
  }
  return _client;
}

export async function runApifyActor(
  actorId: string,
  input: Record<string, any>,
  timeoutSecs = 300
): Promise<any[]> {
  const client = getClient();

  const run = await client.actor(actorId).call(input, {
    timeout: timeoutSecs,
    memory: 256,
  });

  if (!run.defaultDatasetId) {
    throw new Error(`Apify actor ${actorId} produced no dataset`);
  }

  const { items } = await client
    .dataset(run.defaultDatasetId)
    .listItems({ limit: 100 });

  return items;
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
