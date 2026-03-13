import { searchWeb } from "../firecrawl";
import {
  runApifyActor, APIFY_ACTORS, formatYouTubeCommentsInput,
  isApifyConfigured,
} from "../apify";

export interface YouTubeComment {
  id: string;
  text: string;
  author: string;
  authorId: string;
  videoTitle: string;
  videoUrl: string;
  timestamp: string;
  likes: number;
}

/**
 * Scrape YouTube video comments — comments on property review videos
 * are high-intent signals for potential buyers.
 * Primary: Apify actor. Fallback: Firecrawl.
 */
export async function scrapeYouTubeComments(
  videoUrlOrSearch: string,
  limit = 15
): Promise<YouTubeComment[]> {
  if (isApifyConfigured()) {
    try {
      const input = formatYouTubeCommentsInput(videoUrlOrSearch, limit);
      const items = await runApifyActor(APIFY_ACTORS.YOUTUBE_COMMENTS, input, { maxItems: limit });
      if (items.length > 0) return items.map(mapApifyComment).filter(Boolean) as YouTubeComment[];
    } catch (e) {
      console.warn("YouTube Apify failed:", e);
    }
  }

  return scrapeViaFirecrawl(videoUrlOrSearch, limit);
}

function mapApifyComment(item: any): YouTubeComment | null {
  const text = item.text || item.commentText || item.comment || "";
  if (!text || text.length < 10) return null;

  const author = item.author || item.authorName || item.userName || "YouTube Viewer";
  const authorId = item.authorChannelId || item.authorUrl || author;
  const videoUrl = item.videoUrl || item.videoLink || item.url || "";
  const videoTitle = item.videoTitle || item.title || "";

  return {
    id: item.id || item.commentId || `yt-${Buffer.from(text.slice(0, 50)).toString("base64").slice(0, 12)}`,
    text: text.slice(0, 3000),
    author,
    authorId,
    videoTitle,
    videoUrl,
    timestamp: item.publishedAt || item.timestamp || item.date || new Date().toISOString(),
    likes: item.likes || item.likeCount || item.voteCount || 0,
  };
}

async function scrapeViaFirecrawl(videoUrlOrSearch: string, limit: number): Promise<YouTubeComment[]> {
  const query = `site:youtube.com ${videoUrlOrSearch} hyderabad flat apartment review`.trim();
  const results = await searchWeb(query, limit);

  return results
    .filter((r) => r.url?.includes("youtube.com"))
    .map((r) => ({
      id: `yt-${Buffer.from(r.url).toString("base64").slice(0, 12)}`,
      text: r.markdown?.slice(0, 2000) ?? "",
      author: "YouTube Viewer",
      authorId: `yt-${Buffer.from(r.url).toString("base64").slice(0, 8)}`,
      videoTitle: r.title ?? "",
      videoUrl: r.url,
      timestamp: new Date().toISOString(),
      likes: 0,
    }));
}
