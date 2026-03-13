import { searchWeb } from "../firecrawl";

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

export async function scrapeInstagram(
  identifier: string,
  keywords: string[],
  limit = 10
): Promise<InstagramPost[]> {
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
