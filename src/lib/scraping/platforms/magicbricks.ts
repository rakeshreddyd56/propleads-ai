import { runApifyActor, APIFY_ACTORS } from "../apify";
import type { PropertyListing } from "./ninety-nine-acres";

/**
 * Scrapes MagicBricks for property listings and buyer inquiries.
 * Returns normalized property listings that can be analyzed for buyer intent.
 */
export async function scrapeMagicBricks(
  city: string,
  keywords: string[],
  limit = 25
): Promise<PropertyListing[]> {
  const searchQuery = keywords.join(" ");
  const items = await runApifyActor(APIFY_ACTORS.MAGICBRICKS, {
    searchUrl: `https://www.magicbricks.com/property-for-sale/residential-real-estate?bedroom=&proptype=Multistorey-Apartment,Builder-Floor-Apartment,Penthouse,Studio-Apartment,Residential-House,Villa&cityName=${city}&keyword=${encodeURIComponent(searchQuery)}`,
    maxItems: limit,
  });

  return items.map((item: any) => ({
    id: item.id ?? item.propertyId ?? String(Math.random()),
    title: item.title ?? item.propertyTitle ?? "",
    description: item.description ?? item.propertyDescription ?? "",
    price: item.price ?? item.priceFormatted ?? "",
    location: item.location ?? item.address ?? item.locality ?? "",
    area: item.locality ?? item.area ?? city,
    propertyType: item.propertyType ?? item.type ?? "",
    sellerName: item.sellerName ?? item.builderName ?? item.agentName ?? "Unknown",
    sellerContact: item.sellerPhone ?? item.contactNumber ?? null,
    url: item.url ?? item.propertyUrl ?? "",
    postedDate: item.postedDate ?? item.date ?? new Date().toISOString(),
    sqft: item.sqft ?? item.superBuiltUpArea ?? item.carpetArea ?? null,
    bedrooms: item.bedrooms ?? item.bhk ?? null,
  }));
}
