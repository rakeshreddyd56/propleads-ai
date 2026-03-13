import { searchWeb } from "../firecrawl";
import {
  runApifyActor, APIFY_ACTORS, formatInstagramInput,
  isApifyConfigured,
} from "../apify";

export interface InstagramPost {
  id: string;
  text: string;
  author: string;
  authorId: string;
  url: string;
  timestamp: string;
  likes: number;
  comments: { text: string; author: string }[];
}

/**
 * Scrape Instagram posts + comments for real estate leads.
 * Primary: Apify actor (real posts with engagement data + comments).
 * Fallback: Firecrawl web search.
 */
export async function scrapeInstagram(
  identifier: string,
  keywords: string[],
  limit = 10
): Promise<InstagramPost[]> {
  if (isApifyConfigured()) {
    try {
      const input = formatInstagramInput(identifier, limit);
      const items = await runApifyActor(APIFY_ACTORS.INSTAGRAM, input, { maxItems: limit });
      if (items.length > 0) return items.map(mapApifyPost).filter(Boolean) as InstagramPost[];
    } catch (e) {
      console.warn("Instagram Apify failed:", e);
    }
  }

  return scrapeViaFirecrawl(identifier, keywords, limit);
}

function mapApifyPost(item: any): InstagramPost | null {
  // Apify Instagram scraper returns various formats depending on content type
  const caption = item.caption || item.text || item.description || "";
  if (!caption || caption.length < 10) return null;

  const username = item.ownerUsername || item.username || item.author || "unknown";
  const postUrl = item.url || item.shortCode
    ? `https://www.instagram.com/p/${item.shortCode}/`
    : item.inputUrl || "";

  // Extract comments if available
  const comments: { text: string; author: string }[] = [];
  if (Array.isArray(item.latestComments)) {
    for (const c of item.latestComments.slice(0, 10)) {
      const commentText = c.text || c.body || "";
      if (commentText.length > 10) {
        comments.push({
          text: commentText,
          author: c.ownerUsername || c.username || c.author || "unknown",
        });
      }
    }
  }
  if (Array.isArray(item.comments)) {
    for (const c of item.comments.slice(0, 10)) {
      const commentText = c.text || c.body || "";
      if (commentText.length > 10) {
        comments.push({
          text: commentText,
          author: c.ownerUsername || c.username || c.author || "unknown",
        });
      }
    }
  }

  return {
    id: item.id || item.shortCode || `ig-${Buffer.from(postUrl).toString("base64").slice(0, 12)}`,
    text: caption.slice(0, 3000),
    author: username,
    authorId: item.ownerId || username,
    url: postUrl,
    timestamp: item.timestamp || item.takenAtTimestamp
      ? new Date((item.timestamp || item.takenAtTimestamp) * 1000).toISOString()
      : new Date().toISOString(),
    likes: item.likesCount || item.likes || 0,
    comments,
  };
}

async function scrapeViaFirecrawl(identifier: string, keywords: string[], limit: number): Promise<InstagramPost[]> {
  const cleanId = identifier.replace(/^#/, "");
  const keywordStr = keywords.slice(0, 3).join(" ");
  const query = `site:instagram.com ${cleanId} ${keywordStr} hyderabad property`.trim();
  const results = await searchWeb(query, limit);

  return results
    .filter((r) => r.url?.includes("instagram.com"))
    .map((r) => ({
      id: `ig-${Buffer.from(r.url).toString("base64").slice(0, 12)}`,
      text: r.markdown?.slice(0, 2000) ?? r.title ?? "",
      author: r.url.match(/instagram\.com\/([^/]+)/)?.[1] ?? "unknown",
      authorId: r.url.match(/instagram\.com\/([^/]+)/)?.[1] ?? "unknown",
      url: r.url,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: [],
    }));
}
