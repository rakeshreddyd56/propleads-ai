// Reddit scraper — uses Firecrawl to bypass cloud IP blocks,
// falls back to direct .json endpoints if Firecrawl unavailable.

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  url: string;
  permalink: string;
  score: number;
  created_utc: number;
  num_comments: number;
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function searchSubreddit(
  subreddit: string,
  keywords: string[],
  limit = 25
): Promise<RedditPost[]> {
  const query = keywords.join(" OR ");
  const jsonUrl = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&sort=new&limit=${limit}&t=month`;

  // Strategy 1: Firecrawl (bypasses IP blocks by scraping through residential proxies)
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      const posts = await fetchViaFirecrawl(jsonUrl);
      if (posts.length > 0) return posts;
    } catch (e) {
      console.warn(`Firecrawl Reddit failed for r/${subreddit}:`, e);
    }
  }

  // Strategy 2: Direct fetch (works from residential IPs, local dev, etc.)
  try {
    return await fetchDirect(jsonUrl);
  } catch (e) {
    console.warn(`Direct Reddit failed for r/${subreddit}:`, e);
  }

  // Strategy 3: Try old.reddit.com (sometimes less aggressively blocked)
  try {
    const oldUrl = jsonUrl.replace("www.reddit.com", "old.reddit.com");
    return await fetchDirect(oldUrl);
  } catch (e) {
    console.warn(`old.reddit.com failed for r/${subreddit}:`, e);
  }

  throw new Error(
    `Reddit r/${subreddit}: all methods blocked. Configure FIRECRAWL_API_KEY or APIFY_API_TOKEN for reliable scraping.`
  );
}

export async function getNewPosts(
  subreddit: string,
  limit = 50
): Promise<RedditPost[]> {
  const jsonUrl = `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`;

  if (process.env.FIRECRAWL_API_KEY) {
    try {
      const posts = await fetchViaFirecrawl(jsonUrl);
      if (posts.length > 0) return posts;
    } catch {}
  }

  return fetchDirect(jsonUrl);
}

/**
 * Fetch Reddit JSON via Firecrawl's scrape endpoint.
 * Firecrawl uses its own infrastructure which has residential IPs.
 */
async function fetchViaFirecrawl(jsonUrl: string): Promise<RedditPost[]> {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      url: jsonUrl,
      formats: ["rawHtml"],
      waitFor: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firecrawl error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const raw = data.data?.rawHtml ?? data.data?.html ?? "";

  // Firecrawl returns the page content — for .json URLs it should be the JSON data
  try {
    // Try to parse as JSON directly (if Firecrawl returned raw JSON)
    const jsonData = JSON.parse(raw);
    return parseRedditListing(jsonData);
  } catch {
    // If Firecrawl wrapped it in HTML, try extracting the JSON from body
    const jsonMatch = raw.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
    if (jsonMatch) {
      try {
        const jsonData = JSON.parse(jsonMatch[1]);
        return parseRedditListing(jsonData);
      } catch {}
    }

    // Try markdown format as last resort — parse post titles and content
    const markdown = data.data?.markdown ?? "";
    if (markdown) {
      return parseRedditMarkdown(markdown);
    }
  }

  return [];
}

/**
 * Direct fetch to Reddit .json endpoint.
 * Works from residential IPs but blocked from cloud/datacenter IPs.
 */
async function fetchDirect(url: string): Promise<RedditPost[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    if (res.status === 429) {
      await delay(3000);
      const retry = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!retry.ok) throw new Error(`Reddit rate limited: ${retry.status}`);
      const data = await retry.json();
      return parseRedditListing(data);
    }
    throw new Error(`Reddit API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return parseRedditListing(data);
}

function parseRedditListing(data: any): RedditPost[] {
  return (data?.data?.children ?? [])
    .filter(
      (c: any) =>
        c.data.author !== "[deleted]" && c.data.author !== "AutoModerator"
    )
    .map((c: any) => ({
      id: c.data.id,
      title: c.data.title,
      selftext: c.data.selftext ?? "",
      author: c.data.author,
      subreddit: c.data.subreddit,
      url: c.data.url,
      permalink: `https://reddit.com${c.data.permalink}`,
      score: c.data.score,
      created_utc: c.data.created_utc,
      num_comments: c.data.num_comments,
    }));
}

/**
 * Parse Reddit posts from Firecrawl markdown output (fallback).
 * When Firecrawl renders the Reddit search page as markdown,
 * we extract post titles and text content.
 */
function parseRedditMarkdown(markdown: string): RedditPost[] {
  const posts: RedditPost[] = [];
  // Match lines that look like Reddit post titles (usually h2/h3 or bold links)
  const sections = markdown.split(/\n(?=#{1,3}\s|\*\*)/);

  for (const section of sections) {
    const titleMatch = section.match(/^#{1,3}\s+(.+)|^\*\*(.+)\*\*/);
    if (!titleMatch) continue;

    const title = (titleMatch[1] ?? titleMatch[2] ?? "").trim();
    if (title.length < 10) continue;

    // Try to extract author
    const authorMatch = section.match(/(?:by\s+|u\/)(\w+)/);
    const author = authorMatch?.[1] ?? "unknown";

    // Try to extract subreddit
    const subMatch = section.match(/r\/(\w+)/);
    const subreddit = subMatch?.[1] ?? "";

    const body = section
      .replace(/^#{1,3}\s+.+\n?/, "")
      .replace(/^\*\*.+\*\*\n?/, "")
      .trim();

    posts.push({
      id: `md-${Buffer.from(title).toString("base64").slice(0, 10)}`,
      title,
      selftext: body.slice(0, 2000),
      author,
      subreddit,
      url: "",
      permalink: "",
      score: 0,
      created_utc: Date.now() / 1000,
      num_comments: 0,
    });
  }

  return posts;
}
