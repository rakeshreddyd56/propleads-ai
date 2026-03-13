import { runApifyActor, APIFY_ACTORS } from "../apify";

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
 * Scrapes Google Maps for real estate agents, builders, and property dealers.
 * Reviews often contain buyer intent signals ("I'm looking for...", "helped me find...").
 * The places themselves are valuable as competitor/partner data.
 */
export async function scrapeGoogleMaps(
  searchQuery: string,
  city: string,
  limit = 20
): Promise<GoogleMapsPlace[]> {
  const items = await runApifyActor(APIFY_ACTORS.GOOGLE_MAPS, {
    searchStringsArray: [`${searchQuery} in ${city}`],
    maxCrawledPlacesPerSearch: limit,
    language: "en",
    includeReviews: true,
    maxReviews: 10,
  });

  return items.map((item: any) => ({
    id: item.placeId ?? item.id ?? String(Math.random()),
    name: item.title ?? item.name ?? "",
    address: item.address ?? item.street ?? "",
    phone: item.phone ?? item.phoneUnformatted ?? null,
    website: item.website ?? item.url ?? null,
    rating: item.totalScore ?? item.rating ?? null,
    reviewCount: item.reviewsCount ?? item.reviews?.length ?? 0,
    category: item.categoryName ?? item.category ?? "Real Estate",
    url: item.url ?? `https://maps.google.com/?q=${encodeURIComponent(item.title ?? searchQuery)}`,
    reviews: (item.reviews ?? []).slice(0, 10).map((r: any) => ({
      text: r.text ?? r.reviewText ?? "",
      author: r.name ?? r.author ?? "Anonymous",
      rating: r.stars ?? r.rating ?? 0,
    })),
  }));
}
