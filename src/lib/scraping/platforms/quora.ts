import { runApifyActor, APIFY_ACTORS } from "../apify";

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
 * Scrapes Quora for property-buying questions.
 * Questions like "Where should I buy a flat in Hyderabad?" signal strong buyer intent.
 * The questioner + answer commenters are both potential leads.
 */
export async function scrapeQuora(
  searchQuery: string,
  keywords: string[],
  limit = 20
): Promise<QuoraQuestion[]> {
  const query = keywords.length > 0
    ? keywords.slice(0, 5).join(" ")
    : searchQuery;

  const items = await runApifyActor(APIFY_ACTORS.QUORA, {
    searchTerms: [query],
    maxResults: limit,
  });

  return items
    .filter((item: any) => item.question || item.title)
    .map((item: any) => ({
      id: item.qid ?? item.id ?? String(Math.random()),
      question: item.question ?? item.title ?? "",
      details: item.details ?? item.questionText ?? item.answer?.text ?? "",
      author: item.authorName ?? item.author?.name ?? "Anonymous",
      authorId: item.authorProfile ?? item.author?.url ?? "unknown",
      url: item.url ?? item.questionUrl ?? "",
      answers: item.answerCount ?? item.numAnswers ?? 0,
      followers: item.followerCount ?? 0,
      timestamp: item.createdAt ?? item.date ?? new Date().toISOString(),
    }));
}
