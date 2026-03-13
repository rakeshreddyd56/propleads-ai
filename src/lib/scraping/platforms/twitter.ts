import { searchWeb } from "../firecrawl";

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

export async function scrapeTwitter(
  searchQuery: string,
  keywords: string[],
  limit = 10
): Promise<Tweet[]> {
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
