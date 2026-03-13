import { runApifyActor, APIFY_ACTORS } from "../apify";

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

/**
 * Scrapes Twitter/X for property-related tweets.
 * Searches for keywords related to buying/investing in real estate.
 */
export async function scrapeTwitter(
  searchQuery: string,
  keywords: string[],
  limit = 25
): Promise<Tweet[]> {
  const query = keywords.length > 0
    ? keywords.slice(0, 5).join(" OR ")
    : searchQuery;

  const items = await runApifyActor(APIFY_ACTORS.TWITTER, {
    searchTerms: [query],
    maxTweets: limit,
    sort: "Latest",
  });

  return items
    .filter((item: any) => item.full_text || item.text)
    .map((item: any) => ({
      id: item.id_str ?? item.id ?? String(Math.random()),
      text: item.full_text ?? item.text ?? "",
      author: item.user?.screen_name ?? item.author?.userName ?? "unknown",
      authorId: item.user?.id_str ?? item.author?.id ?? "unknown",
      url: item.url ?? `https://x.com/${item.user?.screen_name ?? "i"}/status/${item.id_str ?? ""}`,
      timestamp: item.created_at ?? item.createdAt ?? new Date().toISOString(),
      likes: item.favorite_count ?? item.likeCount ?? 0,
      retweets: item.retweet_count ?? item.retweetCount ?? 0,
      replies: item.reply_count ?? item.replyCount ?? 0,
    }));
}
