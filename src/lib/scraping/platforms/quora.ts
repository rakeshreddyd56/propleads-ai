import { searchWeb } from "../firecrawl";
import {
  runApifyActor, APIFY_ACTORS, formatQuoraInput,
  isApifyConfigured, ApifyRentalError,
} from "../apify";

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

/**
 * Scrape Quora questions/answers about Hyderabad real estate.
 * Primary: Apify actor (real questions with answers + author info).
 * Fallback: Firecrawl web search.
 *
 * Quora is high-value: people asking "where should I buy a flat in Hyderabad"
 * or "is Gachibowli good for investment" are strong buyer intent signals.
 */
export async function scrapeQuora(
  searchQuery: string,
  keywords: string[],
  limit = 10
): Promise<QuoraQuestion[]> {
  if (isApifyConfigured()) {
    try {
      const query = keywords.length > 0
        ? `${searchQuery} ${keywords.slice(0, 2).join(" ")}`
        : searchQuery;
      const input = formatQuoraInput(query, limit);
      const items = await runApifyActor(APIFY_ACTORS.QUORA, input, { maxItems: limit });
      if (items.length > 0) return items.map(mapApifyQuestion).filter(Boolean) as QuoraQuestion[];
    } catch (e) {
      if (e instanceof ApifyRentalError) {
        console.log("Quora Apify actor needs rental, falling back to Firecrawl");
      } else {
        console.warn("Quora Apify failed:", e);
      }
    }
  }

  return scrapeViaFirecrawl(searchQuery, keywords, limit);
}

function mapApifyQuestion(item: any): QuoraQuestion | null {
  const question = item.question || item.title || item.questionTitle || "";
  if (!question) return null;

  // Quora scraper may return answers inline or as separate items
  const details = item.answerText || item.details || item.content || item.answers?.[0]?.text || "";
  const author = item.author || item.authorName || item.answerer || "Quora User";
  const authorId = item.authorId || item.authorUrl ||
    `q-${Buffer.from(author).toString("base64").slice(0, 8)}`;

  return {
    id: item.id || item.questionId || `q-${Buffer.from(question.slice(0, 50)).toString("base64").slice(0, 12)}`,
    question,
    details: details.slice(0, 3000),
    author,
    authorId,
    url: item.url || item.questionUrl || "",
    answers: item.answerCount || item.answers?.length || 0,
    followers: item.followers || item.followCount || 0,
    timestamp: item.date || item.timestamp || new Date().toISOString(),
  };
}

async function scrapeViaFirecrawl(searchQuery: string, keywords: string[], limit: number): Promise<QuoraQuestion[]> {
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
