import { searchWeb } from "../firecrawl";

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

export async function scrapeGoogleMaps(
  searchQuery: string,
  city: string,
  limit = 10
): Promise<GoogleMapsPlace[]> {
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
