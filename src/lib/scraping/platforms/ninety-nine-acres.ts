import { runApifyActor, APIFY_ACTORS } from "../apify";

export interface PropertyListing {
  id: string;
  title: string;
  description: string;
  price: string;
  location: string;
  area: string;
  propertyType: string;
  sellerName: string;
  sellerContact: string | null;
  url: string;
  postedDate: string;
  sqft: number | null;
  bedrooms: number | null;
}

/**
 * Scrapes 99acres for property buyers/renters looking in specific areas.
 * We look at "wanted" or "requirement" posts, not seller listings.
 * This helps find leads who are actively looking for properties.
 */
export async function scrape99Acres(
  city: string,
  keywords: string[],
  limit = 25
): Promise<PropertyListing[]> {
  const searchQuery = keywords.join(" ");
  const items = await runApifyActor(APIFY_ACTORS.NINETY_NINE_ACRES, {
    searchUrl: `https://www.99acres.com/search/property/buy/${city.toLowerCase()}?search_type=QS&search_location=${city}&preference=S&city=${city}&keyword=${encodeURIComponent(searchQuery)}`,
    maxItems: limit,
  });

  return items.map((item: any) => ({
    id: item.id ?? item.propertyId ?? String(Math.random()),
    title: item.title ?? item.name ?? "",
    description: item.description ?? item.details ?? "",
    price: item.price ?? item.priceFormatted ?? "",
    location: item.location ?? item.address ?? item.locality ?? "",
    area: item.locality ?? item.area ?? city,
    propertyType: item.propertyType ?? item.type ?? "",
    sellerName: item.sellerName ?? item.agentName ?? item.dealerName ?? "Unknown",
    sellerContact: item.sellerPhone ?? item.agentPhone ?? item.phone ?? null,
    url: item.url ?? item.propertyUrl ?? "",
    postedDate: item.postedDate ?? item.date ?? new Date().toISOString(),
    sqft: item.sqft ?? item.builtUpArea ?? item.carpetArea ?? null,
    bedrooms: item.bedrooms ?? item.bhk ?? null,
  }));
}
