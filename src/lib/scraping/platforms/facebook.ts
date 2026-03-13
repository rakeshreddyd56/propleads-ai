import { runApifyActor, APIFY_ACTORS } from "../apify";

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
  limit = 25
): Promise<FacebookPost[]> {
  const items = await runApifyActor(APIFY_ACTORS.FACEBOOK_GROUPS, {
    groupUrls: [`https://www.facebook.com/groups/${groupId}`],
    maxPosts: limit,
    maxComments: 0,
    searchQuery: keywords.slice(0, 5).join(" "),
  });

  return items
    .filter((item: any) => item.text && item.user?.name)
    .map((item: any) => ({
      id: item.postId ?? item.id ?? String(Date.now()),
      text: item.text ?? "",
      author: item.user?.name ?? "Unknown",
      authorId: item.user?.id ?? item.user?.name ?? "unknown",
      url: item.url ?? item.postUrl ?? `https://facebook.com/groups/${groupId}`,
      timestamp: item.timestamp ?? item.date ?? new Date().toISOString(),
      likes: item.likes ?? item.reactionsCount ?? 0,
      comments: item.comments ?? item.commentsCount ?? 0,
    }));
}
