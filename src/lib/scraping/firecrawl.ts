const FIRECRAWL_API = "https://api.firecrawl.dev/v1";

function getHeaders() {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY is not configured");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
}

/** Strip web page chrome (navigation, footers, accessibility text) from scraped markdown */
function cleanScrapedMarkdown(md: string): string {
  if (!md) return "";
  return md
    .replace(/Skip to (?:content|search|navigation|main)/gi, "")
    .replace(/\[Go to .+?\]\(.+?\)/g, "")
    .replace(/Sign [Ii]n\s*/g, "")
    .replace(/Something went wrong\. Wait a moment and try again\.\s*/g, "")
    .replace(/Try again\s*/g, "")
    .replace(/All related \(\d+\)\s*/g, "")
    .replace(/Sort\s*\n\s*Recommended/g, "")
    .replace(/Profile photo for .+/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  if (!res.ok) {
    console.error(`Firecrawl scrape failed: ${res.status} ${res.statusText}`);
    return { markdown: "", rawHtml: "", metadata: {} };
  }
  const data = await res.json();
  return {
    markdown: cleanScrapedMarkdown(data.data?.markdown ?? ""),
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
  if (!res.ok) {
    console.error(`Firecrawl search failed: ${res.status} ${res.statusText}`);
    return [];
  }
  const data = await res.json();
  // Clean markdown in each result
  return (data.data ?? []).map((r: any) => ({
    ...r,
    markdown: cleanScrapedMarkdown(r.markdown ?? ""),
  }));
}
