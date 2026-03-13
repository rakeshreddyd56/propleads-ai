import { searchWeb } from "../firecrawl";
import {
  runApifyActor, APIFY_ACTORS, formatFacebookGroupInput,
  isApifyConfigured,
} from "../apify";

export interface FacebookPost {
  id: string;
  text: string;
  author: string;
  authorId: string;
  url: string;
  timestamp: string;
  likes: number;
  comments: number;
}

/**
 * Scrape Facebook Group posts for real estate buyer intent.
 * Primary: Apify actor (real group posts with engagement + comments).
 * Fallback: Firecrawl web search.
 *
 * Note: Facebook Groups scraper may need cookies for private groups.
 * Public groups work without cookies.
 */
export async function scrapeFacebookGroup(
  groupId: string,
  keywords: string[],
  limit = 10
): Promise<FacebookPost[]> {
  if (isApifyConfigured()) {
    try {
      const input = formatFacebookGroupInput(groupId, limit);
      const items = await runApifyActor(APIFY_ACTORS.FACEBOOK_GROUPS, input, { maxItems: limit });
      if (items.length > 0) return items.map(mapApifyPost).filter(Boolean) as FacebookPost[];
    } catch (e) {
      console.warn("Facebook Groups Apify failed:", e);
    }
  }

  return scrapeViaFirecrawl(groupId, keywords, limit);
}

function mapApifyPost(item: any): FacebookPost | null {
  // Facebook Groups scraper output format
  const text = item.text || item.message || item.postText || item.content || "";
  if (!text || text.length < 10) return null;

  const author = item.user?.name || item.authorName || item.userName || item.author || "Facebook User";
  const authorId = item.user?.id || item.authorId || item.userId ||
    `fb-${Buffer.from(author).toString("base64").slice(0, 8)}`;

  const postUrl = item.url || item.postUrl || item.link || "";

  return {
    id: item.postId || item.id || `fb-${Buffer.from(postUrl || text.slice(0, 50)).toString("base64").slice(0, 12)}`,
    text: text.slice(0, 3000),
    author,
    authorId: String(authorId),
    url: postUrl,
    timestamp: item.time || item.timestamp || item.publishedAt || new Date().toISOString(),
    likes: item.likes || item.reactionsCount || item.reactions || 0,
    comments: item.comments || item.commentsCount || 0,
  };
}

async function scrapeViaFirecrawl(groupId: string, keywords: string[], limit: number): Promise<FacebookPost[]> {
  const keywordStr = keywords.slice(0, 3).join(" ");
  const query = `site:facebook.com ${keywordStr} hyderabad property flat buy`.trim();
  const results = await searchWeb(query, limit);

  return results
    .filter((r) => r.url?.includes("facebook.com"))
    .map((r) => ({
      id: `fb-${Buffer.from(r.url).toString("base64").slice(0, 12)}`,
      text: r.markdown?.slice(0, 2000) ?? r.title ?? "",
      author: "Facebook User",
      authorId: `fb-${Buffer.from(r.url).toString("base64").slice(0, 8)}`,
      url: r.url,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: 0,
    }));
}
