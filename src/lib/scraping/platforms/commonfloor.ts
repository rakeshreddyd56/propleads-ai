import { scrapeUrl } from "../firecrawl";
import { isPropertyRelated } from "../parser";

export interface CommonFloorPost {
  id: string;
  text: string;
  author: string;
  url: string;
  timestamp: string;
}

/**
 * Scrapes CommonFloor society forums using Firecrawl.
 * CommonFloor has resident forums where people discuss property needs.
 * Falls back gracefully if Firecrawl is not configured.
 */
export async function scrapeCommonFloor(
  identifier: string,
  keywords: string[],
  limit = 15
): Promise<CommonFloorPost[]> {
  if (!process.env.FIRECRAWL_API_KEY) {
    console.log("CommonFloor scraping skipped: FIRECRAWL_API_KEY not configured");
    return [];
  }

  const url = `https://www.commonfloor.com/forum/${identifier}`;

  try {
    const { markdown } = await scrapeUrl(url);
    if (!markdown) return [];

    // Parse forum posts from markdown
    const posts: CommonFloorPost[] = [];
    const sections = markdown.split(/#{2,3}\s+/);

    for (const section of sections.slice(0, limit)) {
      const lines = section.trim().split("\n");
      if (lines.length === 0) continue;

      const title = lines[0].trim();
      const body = lines.slice(1).join("\n").trim();
      const fullText = `${title}\n${body}`;

      if (!isPropertyRelated(fullText)) continue;

      posts.push({
        id: `cf-${Buffer.from(title).toString("base64").slice(0, 12)}`,
        text: fullText,
        author: "CommonFloor User",
        url: `${url}#${encodeURIComponent(title.slice(0, 50))}`,
        timestamp: new Date().toISOString(),
      });
    }

    return posts;
  } catch (e) {
    console.error("CommonFloor scraping error:", e);
    return [];
  }
}
