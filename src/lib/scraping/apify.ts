const APIFY_API = "https://api.apify.com/v2";

export async function runApifyActor(actorId: string, input: Record<string, any>): Promise<any[]> {
  const res = await fetch(`${APIFY_API}/acts/${actorId}/runs?token=${process.env.APIFY_API_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const run = await res.json();
  const runId = run.data?.id;
  if (!runId) throw new Error("Failed to start Apify actor");

  // Wait for completion (poll every 5s, max 5 min)
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusRes = await fetch(`${APIFY_API}/actor-runs/${runId}?token=${process.env.APIFY_API_TOKEN}`);
    const statusData = await statusRes.json();
    if (statusData.data?.status === "SUCCEEDED") {
      const datasetId = statusData.data.defaultDatasetId;
      const itemsRes = await fetch(`${APIFY_API}/datasets/${datasetId}/items?token=${process.env.APIFY_API_TOKEN}`);
      return itemsRes.json();
    }
    if (statusData.data?.status === "FAILED" || statusData.data?.status === "ABORTED") {
      throw new Error(`Apify actor ${actorId} ${statusData.data.status}`);
    }
  }
  throw new Error("Apify actor timed out");
}

export const APIFY_ACTORS = {
  NINETY_NINE_ACRES: "natasha.lekh/99acres-scraper",
  MAGICBRICKS: "natasha.lekh/magicbricks-scraper",
  NOBROKER: "curious_coder/nobroker-scraper",
  FACEBOOK_GROUPS: "apify/facebook-groups-scraper",
  GOOGLE_MAPS: "compass/crawler-google-places",
};
