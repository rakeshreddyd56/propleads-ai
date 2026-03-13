import { searchWeb } from "../firecrawl";
import {
  runApifyActor, APIFY_ACTORS, formatTwitterInput,
  isApifyConfigured,
} from "../apify";

export interface Tweet {
  id: string;
  text: string;
  author: string;
  authorId: string;
  url: string;
  timestamp: string;
  likes: number;
  retweets: number;
  replies: number;
}

/**
 * Scrape Twitter/X tweets by keyword search.
 * Primary: Apify actor (real tweets with engagement).
 * Fallback: Firecrawl web search.
 */
export async function scrapeTwitter(
  searchQuery: string,
  keywords: string[],
  limit = 10
): Promise<Tweet[]> {
  if (isApifyConfigured()) {
    try {
      const input = formatTwitterInput(searchQuery, keywords, limit);
      const items = await runApifyActor(APIFY_ACTORS.TWITTER, input, { maxItems: limit });
      const mapped = items
        .filter((item) => !item.noResults)
        .map(mapApifyTweet)
        .filter(Boolean) as Tweet[];
      if (mapped.length > 0) return mapped;
    } catch (e) {
      console.warn("Twitter Apify failed:", e);
    }
  }

  return scrapeViaFirecrawl(searchQuery, keywords, limit);
}

function mapApifyTweet(item: any): Tweet | null {
  // Tweet Scraper V2 output format
  const text = item.full_text || item.text || item.tweet_text || "";
  if (!text || text.length < 10) return null;

  // User info may be nested or flat
  const user = item.user || {};
  const screenName = item.user_screen_name || user.screen_name || item.screen_name || item.author || "unknown";
  const userName = item.user_name || user.name || item.name || screenName;

  const tweetId = item.id_str || item.tweet_id || item.id || "";
  const tweetUrl = item.url || item.tweet_url ||
    (screenName && tweetId ? `https://x.com/${screenName}/status/${tweetId}` : "");

  return {
    id: tweetId || `tw-${Buffer.from(tweetUrl || text.slice(0, 50)).toString("base64").slice(0, 12)}`,
    text: text.slice(0, 3000),
    author: userName,
    authorId: screenName,
    url: tweetUrl,
    timestamp: item.created_at || item.timestamp || new Date().toISOString(),
    likes: item.favorite_count || item.likes || item.like_count || 0,
    retweets: item.retweet_count || item.retweets || 0,
    replies: item.reply_count || item.replies || 0,
  };
}

async function scrapeViaFirecrawl(searchQuery: string, keywords: string[], limit: number): Promise<Tweet[]> {
  const keywordStr = keywords.length > 0 ? keywords.slice(0, 3).join(" ") : searchQuery;
  const query = `site:x.com OR site:twitter.com ${keywordStr} hyderabad property flat buy`.trim();
  const results = await searchWeb(query, limit);

  return results
    .filter((r) => r.url?.includes("x.com") || r.url?.includes("twitter.com"))
    .map((r) => {
      const authorMatch = r.url.match(/(?:x\.com|twitter\.com)\/([^/]+)/);
      return {
        id: `tw-${Buffer.from(r.url).toString("base64").slice(0, 12)}`,
        text: r.markdown?.slice(0, 2000) ?? r.title ?? "",
        author: authorMatch?.[1] ?? "unknown",
        authorId: authorMatch?.[1] ?? "unknown",
        url: r.url,
        timestamp: new Date().toISOString(),
        likes: 0,
        retweets: 0,
        replies: 0,
      };
    });
}
