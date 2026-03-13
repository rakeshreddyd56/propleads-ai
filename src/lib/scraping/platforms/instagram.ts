import { runApifyActor, APIFY_ACTORS } from "../apify";

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

/**
 * Scrapes Instagram hashtags and accounts for property-related posts and comments.
 * Comments on real estate posts often contain buyer intent.
 */
export async function scrapeInstagram(
  identifier: string,
  keywords: string[],
  limit = 20
): Promise<InstagramPost[]> {
  // Determine if identifier is a hashtag or profile
  const isHashtag = identifier.startsWith("#") || !identifier.includes("/");
  const cleanId = identifier.replace(/^#/, "");

  const input: Record<string, any> = {
    resultsLimit: limit,
  };

  if (isHashtag) {
    input.hashtags = [cleanId];
  } else {
    input.profiles = [cleanId];
  }

  const items = await runApifyActor(APIFY_ACTORS.INSTAGRAM, input);

  return items
    .filter((item: any) => item.caption || item.text)
    .map((item: any) => ({
      id: item.id ?? item.shortCode ?? String(Math.random()),
      text: item.caption ?? item.text ?? "",
      author: item.ownerUsername ?? item.owner?.username ?? "unknown",
      authorId: item.ownerId ?? item.owner?.id ?? "unknown",
      url: item.url ?? `https://instagram.com/p/${item.shortCode ?? ""}`,
      timestamp: item.timestamp ?? item.takenAtTimestamp
        ? new Date((item.takenAtTimestamp ?? 0) * 1000).toISOString()
        : new Date().toISOString(),
      likes: item.likesCount ?? item.likes ?? 0,
      comments: (item.latestComments ?? item.comments ?? []).slice(0, 10).map((c: any) => ({
        text: c.text ?? "",
        author: c.ownerUsername ?? c.owner?.username ?? "anonymous",
      })),
    }));
}
