import { searchWeb } from "../firecrawl";

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

export async function scrapeYouTubeComments(
  videoUrlOrSearch: string,
  limit = 10
): Promise<YouTubeComment[]> {
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
