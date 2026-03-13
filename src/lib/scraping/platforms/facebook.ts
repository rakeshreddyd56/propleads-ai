import { searchWeb } from "../firecrawl";

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

export async function scrapeFacebookGroup(
  groupId: string,
  keywords: string[],
  limit = 10
): Promise<FacebookPost[]> {
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
