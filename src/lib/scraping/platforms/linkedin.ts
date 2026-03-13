import { runApifyActor, APIFY_ACTORS } from "../apify";

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

/**
 * Scrapes LinkedIn for real estate-related posts.
 * Targets professionals posting about property buying, relocation, investment.
 * LinkedIn is especially valuable for IT professional and NRI personas.
 */
export async function scrapeLinkedIn(
  searchQuery: string,
  keywords: string[],
  limit = 20
): Promise<LinkedInPost[]> {
  const query = keywords.length > 0
    ? keywords.slice(0, 5).join(" ")
    : searchQuery;

  // Use LinkedIn profile scraper to find real estate professionals
  // and their posts about property
  const items = await runApifyActor(APIFY_ACTORS.LINKEDIN, {
    searchUrl: `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(query)}&origin=GLOBAL_SEARCH_HEADER`,
    maxResults: limit,
  });

  return items
    .filter((item: any) => item.text || item.commentary)
    .map((item: any) => ({
      id: item.urn ?? item.id ?? String(Math.random()),
      text: item.text ?? item.commentary ?? "",
      author: item.authorName ?? item.author?.name ?? "Unknown",
      authorId: item.authorProfileUrl ?? item.author?.url ?? "unknown",
      authorTitle: item.authorHeadline ?? item.author?.headline ?? "",
      url: item.postUrl ?? item.url ?? "",
      timestamp: item.postedAt ?? item.date ?? new Date().toISOString(),
      likes: item.numLikes ?? item.socialCounts?.numLikes ?? 0,
      comments: item.numComments ?? item.socialCounts?.numComments ?? 0,
    }));
}
