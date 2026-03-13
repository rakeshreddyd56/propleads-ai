// Reddit scraper — uses Firecrawl web search to find Reddit posts
// (bypasses Reddit's cloud IP blocking entirely)

import { searchWeb } from "./firecrawl";

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
  // Strategy 1: Firecrawl web search (finds Reddit posts via Google, bypasses blocks)
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      const posts = await searchViaFirecrawl(subreddit, keywords, limit);
      if (posts.length > 0) return posts;
    } catch (e) {
      console.warn(`Firecrawl search failed for r/${subreddit}:`, e);
    }
  }

  // Strategy 2: Direct fetch (works from local dev / residential IPs)
  try {
    return await fetchDirect(subreddit, keywords, limit);
  } catch (e) {
    console.warn(`Direct Reddit failed for r/${subreddit}:`, e);
  }

  // Strategy 3: old.reddit.com
  try {
    return await fetchDirect(subreddit, keywords, limit, "old.reddit.com");
  } catch (e) {
    console.warn(`old.reddit.com failed for r/${subreddit}:`, e);
  }

  throw new Error(
    `Reddit r/${subreddit}: all methods failed. Ensure FIRECRAWL_API_KEY is set.`
  );
}

export async function getNewPosts(
  subreddit: string,
  limit = 50
): Promise<RedditPost[]> {
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      return await searchViaFirecrawl(subreddit, [], limit);
    } catch {}
  }
  return fetchDirect(subreddit, [], limit);
}

/**
 * Use Firecrawl's web search to find Reddit posts.
 * Searches Google for "site:reddit.com/r/{subreddit} keywords"
 * and scrapes the results. This completely bypasses Reddit's IP blocks.
 */
async function searchViaFirecrawl(
  subreddit: string,
  keywords: string[],
  limit: number
): Promise<RedditPost[]> {
  const keywordStr = keywords.slice(0, 3).join(" OR ");
  // Try specific subreddit first
  let query = `site:reddit.com/r/${subreddit} ${keywordStr}`.trim();
  let results = await searchWeb(query, Math.min(limit, 10));

  // If no results, try broader search including subreddit name in keywords
  if (results.length === 0) {
    query = `reddit ${subreddit} ${keywordStr} property hyderabad`;
    results = await searchWeb(query, Math.min(limit, 10));
  }

  const posts: RedditPost[] = [];
  for (const result of results) {
    // Only process actual Reddit post URLs
    if (!result.url?.includes("reddit.com/r/")) continue;

    const markdown = result.markdown ?? "";
    const title = result.title?.replace(/ : r\/\w+$/, "")?.replace(/ - Reddit$/, "") ?? "";

    // Extract author from URL or content
    const authorMatch = markdown.match(/(?:Posted by|submitted by|u\/)(\w+)/i);
    const author = authorMatch?.[1] ?? "unknown";

    // Extract subreddit from URL
    const subMatch = result.url.match(/reddit\.com\/r\/(\w+)/);
    const sub = subMatch?.[1] ?? subreddit;

    // Use markdown content as post text (Firecrawl already extracts clean text)
    const selftext = markdown
      .replace(/^#.*\n/gm, "") // Remove markdown headers
      .replace(/\[.*?\]\(.*?\)/g, "") // Remove links
      .trim()
      .slice(0, 3000);

    if (title.length < 5 && selftext.length < 20) continue;

    posts.push({
      id: `fc-${Buffer.from(result.url).toString("base64").slice(0, 12)}`,
      title,
      selftext,
      author,
      subreddit: sub,
      url: result.url,
      permalink: result.url,
      score: 0,
      created_utc: Date.now() / 1000,
      num_comments: 0,
    });
  }

  return posts;
}

/**
 * Direct fetch to Reddit .json endpoint.
 * Works from residential IPs / local dev but blocked from cloud IPs.
 */
async function fetchDirect(
  subreddit: string,
  keywords: string[],
  limit: number,
  domain = "www.reddit.com"
): Promise<RedditPost[]> {
  const query = keywords.join(" OR ");
  const url = query
    ? `https://${domain}/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&sort=new&limit=${limit}&t=month`
    : `https://${domain}/r/${subreddit}/new.json?limit=${limit}`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    if (res.status === 429) {
      await delay(3000);
      const retry = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!retry.ok) throw new Error(`Reddit rate limited: ${retry.status}`);
      return parseRedditListing(await retry.json());
    }
    throw new Error(`Reddit API error: ${res.status} ${res.statusText}`);
  }

  return parseRedditListing(await res.json());
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
