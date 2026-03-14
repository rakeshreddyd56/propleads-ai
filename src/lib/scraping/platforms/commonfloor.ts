// NOTE: CommonFloor was acquired by Quikr in 2016, later merged with Housing.com.
// The society forums (commonfloor.com/forum/) may be defunct or return errors.
// This scraper is kept for backward compatibility but may return empty results.
// If the platform is fully dead, consider removing this source from default seeds.

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
    if (!markdown) {
      console.warn(`CommonFloor: No content returned for ${url}. The site may be defunct (acquired by Quikr/Housing.com).`);
      return [];
    }

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
  } catch (e: any) {
    // CommonFloor is likely defunct — return empty gracefully
    const status = e?.response?.status ?? e?.statusCode;
    if (status === 404 || status === 410 || status === 503) {
      console.warn(`CommonFloor returned ${status} for ${url}. Site may be defunct (acquired by Quikr/Housing.com).`);
    } else {
      console.error("CommonFloor scraping error:", e);
    }
    return [];
  }
}
