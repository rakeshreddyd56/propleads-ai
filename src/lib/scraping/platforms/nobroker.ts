import { runApifyActor, APIFY_ACTORS } from "../apify";
import type { PropertyListing } from "./ninety-nine-acres";

/**
 * Scrapes NoBroker for direct owner listings and buyer requirements.
 * NoBroker is especially valuable as it's a C2C platform —
 * people posting here are direct buyers/sellers, not agents.
 */
export async function scrapeNoBroker(
  city: string,
  keywords: string[],
  limit = 25
): Promise<PropertyListing[]> {
  const citySlug = city.toLowerCase();
  const items = await runApifyActor(APIFY_ACTORS.NOBROKER, {
    searchUrl: `https://www.nobroker.in/property/sale/residential/${citySlug}?searchParam=W3sibGF0IjoiMTcuMzg1MCIsImxvbiI6Ijc4LjQ4NjciLCJwbGFjZUlkIjoiQ2hJSkx4bDZFZHlZeWpzUnMwTHlldjFfWjlzIiwicGxhY2VOYW1lIjoiSHlkZXJhYmFkIn1d&sharedAccommodation=0&pageNo=1&searchType=locality`,
    maxItems: limit,
  });

  return items.map((item: any) => ({
    id: item.id ?? item.propertyId ?? String(Math.random()),
    title: item.title ?? item.propertyTitle ?? "",
    description: item.description ?? item.propertyDescription ?? "",
    price: item.price ?? item.rent ?? item.expectedPrice ?? "",
    location: item.location ?? item.address ?? item.locality ?? "",
    area: item.locality ?? item.area ?? citySlug,
    propertyType: item.propertyType ?? item.type ?? "",
    sellerName: item.ownerName ?? item.name ?? "Owner",
    sellerContact: item.ownerPhone ?? item.phone ?? null,
    url: item.url ?? item.propertyUrl ?? "",
    postedDate: item.postedDate ?? item.activationDate ?? new Date().toISOString(),
    sqft: item.sqft ?? item.propertySize ?? item.carpetArea ?? null,
    bedrooms: item.bedrooms ?? item.bhk ?? null,
  }));
}
