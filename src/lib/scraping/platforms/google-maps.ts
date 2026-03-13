import { searchWeb } from "../firecrawl";
import {
  runApifyActor, APIFY_ACTORS, formatGoogleMapsInput,
  isApifyConfigured,
} from "../apify";

export interface GoogleMapsPlace {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number;
  category: string;
  url: string;
  reviews: { text: string; author: string; rating: number }[];
}

/**
 * Scrape Google Maps for real estate agents/builders + their reviews.
 * Reviews mentioning property searches are high-intent leads.
 *
 * Primary: Apify Google Maps actor (structured business data + real reviews).
 * Fallback: Firecrawl web search.
 */
export async function scrapeGoogleMaps(
  searchQuery: string,
  city: string,
  limit = 10
): Promise<GoogleMapsPlace[]> {
  if (isApifyConfigured()) {
    try {
      const input = formatGoogleMapsInput(searchQuery, city, limit);
      const items = await runApifyActor(APIFY_ACTORS.GOOGLE_MAPS, input, {
        maxItems: limit,
        timeoutSecs: 180, // Google Maps needs more time
      });
      if (items.length > 0) return items.map(mapApifyPlace).filter(Boolean) as GoogleMapsPlace[];
    } catch (e) {
      console.warn("Google Maps Apify failed:", e);
    }
  }

  return scrapeViaFirecrawl(searchQuery, city, limit);
}

function mapApifyPlace(item: any): GoogleMapsPlace | null {
  const name = item.title || item.name || item.searchString || "";
  if (!name) return null;

  // Extract reviews — Apify returns them as an array
  const reviews: { text: string; author: string; rating: number }[] = [];
  if (Array.isArray(item.reviews)) {
    for (const r of item.reviews.slice(0, 10)) {
      const reviewText = r.text || r.reviewText || r.body || "";
      if (reviewText.length > 15) {
        reviews.push({
          text: reviewText.slice(0, 1000),
          author: r.name || r.author || r.reviewerName || "Reviewer",
          rating: r.stars || r.rating || r.score || 0,
        });
      }
    }
  }

  return {
    id: item.placeId || item.cid || `gm-${Buffer.from(name).toString("base64").slice(0, 12)}`,
    name,
    address: item.address || item.street || item.neighborhood || "",
    phone: item.phone || item.phoneNumber || item.contactNumber || null,
    website: item.website || item.url || null,
    rating: item.totalScore || item.rating || item.stars || null,
    reviewCount: item.reviewsCount || item.totalReviews || reviews.length,
    category: item.categoryName || item.category || item.type || "Real Estate",
    url: item.url || item.googleUrl || item.directUrl ||
      `https://www.google.com/maps/place/?q=place_id:${item.placeId || ""}`,
    reviews,
  };
}

async function scrapeViaFirecrawl(searchQuery: string, city: string, limit: number): Promise<GoogleMapsPlace[]> {
  const query = `${searchQuery} ${city} reviews real estate agent builder`.trim();
  const results = await searchWeb(query, limit);

  return results.map((r) => ({
    id: `gm-${Buffer.from(r.url).toString("base64").slice(0, 12)}`,
    name: r.title ?? "",
    address: city,
    phone: null,
    website: null,
    rating: null,
    reviewCount: 0,
    category: "Real Estate",
    url: r.url,
    reviews: r.markdown ? [{
      text: r.markdown.slice(0, 1000),
      author: "Reviewer",
      rating: 0,
    }] : [],
  }));
}
