import { searchWeb } from "../firecrawl";

export interface LinkedInPost {
  id: string;
  text: string;
  author: string;
  authorId: string;
  authorTitle: string;
  url: string;
  timestamp: string;
  likes: number;
  comments: number;
}

export async function scrapeLinkedIn(
  searchQuery: string,
  keywords: string[],
  limit = 10
): Promise<LinkedInPost[]> {
  const keywordStr = keywords.length > 0 ? keywords.slice(0, 3).join(" ") : searchQuery;
  const query = `site:linkedin.com/posts ${keywordStr} hyderabad real estate property`.trim();
  const results = await searchWeb(query, limit);

  return results
    .filter((r) => r.url?.includes("linkedin.com"))
    .map((r) => ({
      id: `li-${Buffer.from(r.url).toString("base64").slice(0, 12)}`,
      text: r.markdown?.slice(0, 2000) ?? r.title ?? "",
      author: r.title?.split(" - ")?.[0] ?? "LinkedIn User",
      authorId: r.url,
      authorTitle: "",
      url: r.url,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: 0,
    }));
}
