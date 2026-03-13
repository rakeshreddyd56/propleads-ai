import { runApifyActor, APIFY_ACTORS } from "../apify";

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
 * Scrapes YouTube video comments for property buyer intent.
 * Targets property review videos, virtual tour videos, and area guide videos.
 * Comments often contain "I'm looking for...", "what's the price of...", "is this good for NRIs?" etc.
 */
export async function scrapeYouTubeComments(
  videoUrlOrSearch: string,
  limit = 50
): Promise<YouTubeComment[]> {
  const isUrl = videoUrlOrSearch.startsWith("http");

  const input: Record<string, any> = isUrl
    ? { videoUrls: [videoUrlOrSearch], maxComments: limit }
    : { searchKeywords: videoUrlOrSearch, maxComments: limit, maxVideos: 5 };

  const items = await runApifyActor(APIFY_ACTORS.YOUTUBE_COMMENTS, input);

  return items
    .filter((item: any) => item.text || item.comment)
    .map((item: any) => ({
      id: item.commentId ?? item.id ?? String(Math.random()),
      text: item.text ?? item.comment ?? "",
      author: item.author ?? item.authorName ?? item.userName ?? "Anonymous",
      authorId: item.authorChannelId ?? item.authorUrl ?? "unknown",
      videoTitle: item.videoTitle ?? item.title ?? "",
      videoUrl: item.videoUrl ?? item.url ?? videoUrlOrSearch,
      timestamp: item.publishedAt ?? item.date ?? new Date().toISOString(),
      likes: item.votes ?? item.likeCount ?? 0,
    }));
}
