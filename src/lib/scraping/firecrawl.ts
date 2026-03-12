const FIRECRAWL_API = "https://api.firecrawl.dev/v1";

export async function scrapeUrl(url: string): Promise<{ markdown: string; metadata: any }> {
  const res = await fetch(`${FIRECRAWL_API}/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({ url, formats: ["markdown"] }),
  });
  const data = await res.json();
  return { markdown: data.data?.markdown ?? "", metadata: data.data?.metadata ?? {} };
}

export async function searchWeb(query: string, limit = 10): Promise<{ url: string; title: string; markdown: string }[]> {
  const res = await fetch(`${FIRECRAWL_API}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({ query, limit, scrapeOptions: { formats: ["markdown"] } }),
  });
  const data = await res.json();
  return data.data ?? [];
}
