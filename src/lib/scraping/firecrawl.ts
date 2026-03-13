const FIRECRAWL_API = "https://api.firecrawl.dev/v1";

function getHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
  };
}

export async function scrapeUrl(
  url: string,
  options?: { formats?: string[]; waitFor?: number }
): Promise<{ markdown: string; rawHtml: string; metadata: any }> {
  const res = await fetch(`${FIRECRAWL_API}/scrape`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      url,
      formats: options?.formats ?? ["markdown"],
      waitFor: options?.waitFor ?? 2000,
    }),
  });
  const data = await res.json();
  return {
    markdown: data.data?.markdown ?? "",
    rawHtml: data.data?.rawHtml ?? data.data?.html ?? "",
    metadata: data.data?.metadata ?? {},
  };
}

export async function searchWeb(
  query: string,
  limit = 10
): Promise<{ url: string; title: string; markdown: string }[]> {
  const res = await fetch(`${FIRECRAWL_API}/search`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      query,
      limit,
      scrapeOptions: { formats: ["markdown"] },
    }),
  });
  const data = await res.json();
  return data.data ?? [];
}
