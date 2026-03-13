import { searchWeb } from "../firecrawl";

export interface QuoraQuestion {
  id: string;
  question: string;
  details: string;
  author: string;
  authorId: string;
  url: string;
  answers: number;
  followers: number;
  timestamp: string;
}

export async function scrapeQuora(
  searchQuery: string,
  keywords: string[],
  limit = 10
): Promise<QuoraQuestion[]> {
  const keywordStr = keywords.length > 0 ? keywords.slice(0, 3).join(" ") : searchQuery;
  const query = `site:quora.com ${keywordStr} hyderabad buy flat property`.trim();
  const results = await searchWeb(query, limit);

  return results
    .filter((r) => r.url?.includes("quora.com"))
    .map((r) => ({
      id: `q-${Buffer.from(r.url).toString("base64").slice(0, 12)}`,
      question: r.title?.replace(/ - Quora$/, "") ?? "",
      details: r.markdown?.slice(0, 2000) ?? "",
      author: "Quora User",
      authorId: `q-${Buffer.from(r.url).toString("base64").slice(0, 8)}`,
      url: r.url,
      answers: 0,
      followers: 0,
      timestamp: new Date().toISOString(),
    }));
}
