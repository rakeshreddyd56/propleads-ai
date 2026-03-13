import { db } from "@/lib/db";

export interface PropertyContext {
  areas: string[];
  builders: string[];
  propertyNames: string[];
  priceRange: { min: number; max: number } | null;
  propertyTypes: string[];
  keywords: string[];
}

/**
 * Builds a rich context from all active properties in the org.
 * Used to enrich scraping keywords so we find leads that match our inventory.
 */
export async function getPropertyContext(orgId: string): Promise<PropertyContext> {
  const properties = await db.property.findMany({
    where: { orgId, status: "ACTIVE" },
    select: {
      name: true,
      builderName: true,
      area: true,
      city: true,
      propertyType: true,
      priceMin: true,
      priceMax: true,
      amenities: true,
      usps: true,
    },
  });

  if (properties.length === 0) {
    return {
      areas: ["Gachibowli", "Kondapur", "Kokapet", "Financial District", "HITEC City"],
      builders: [],
      propertyNames: [],
      priceRange: null,
      propertyTypes: ["APARTMENT"],
      keywords: ["flat", "apartment", "property", "buy house", "real estate"],
    };
  }

  const areas = [...new Set(properties.map((p) => p.area).filter(Boolean))];
  const builders = [...new Set(properties.map((p) => p.builderName).filter(Boolean) as string[])];
  const propertyNames = [...new Set(properties.map((p) => p.name).filter(Boolean))];
  const propertyTypes = [...new Set(properties.map((p) => p.propertyType).filter(Boolean))];

  const allMin = properties.map((p) => p.priceMin).filter(Boolean) as bigint[];
  const allMax = properties.map((p) => p.priceMax).filter(Boolean) as bigint[];
  const priceRange =
    allMin.length > 0
      ? {
          min: Number(allMin.reduce((a, b) => (a < b ? a : b))),
          max: Number(allMax.length > 0 ? allMax.reduce((a, b) => (a > b ? a : b)) : allMin[0]),
        }
      : null;

  // Generate contextual keywords from properties
  const keywords = [
    ...areas.map((a) => `${a} flat`),
    ...areas.map((a) => `${a} apartment`),
    ...builders.map((b) => `${b} properties`),
    ...propertyNames,
    "buy house",
    "property",
    "real estate",
    "gated community",
    ...propertyTypes.map((t) => t.toLowerCase().replace("_", " ")),
  ];

  return {
    areas,
    builders,
    propertyNames,
    priceRange,
    propertyTypes,
    keywords: [...new Set(keywords)],
  };
}

/**
 * Merge source-specific keywords with property context keywords
 */
export function enrichKeywords(sourceKeywords: string[], context: PropertyContext): string[] {
  const enriched = new Set(sourceKeywords);
  // Add area-based keywords
  for (const area of context.areas.slice(0, 5)) {
    enriched.add(area);
  }
  // Add property names as keywords
  for (const name of context.propertyNames.slice(0, 3)) {
    enriched.add(name);
  }
  return [...enriched];
}
