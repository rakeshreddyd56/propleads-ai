import { searchWeb } from "../firecrawl";
import {
  runApifyActor, APIFY_ACTORS, formatMagicBricksInput,
  isApifyConfigured, ApifyRentalError,
} from "../apify";
import type { PropertyListing } from "./ninety-nine-acres";

/**
 * Scrape MagicBricks property listings.
 * Primary: Apify actor. Fallback: Firecrawl.
 */
export async function scrapeMagicBricks(
  city: string,
  keywords: string[],
  limit = 10
): Promise<PropertyListing[]> {
  if (isApifyConfigured()) {
    try {
      const input = formatMagicBricksInput(city, keywords, limit);
      const items = await runApifyActor(APIFY_ACTORS.MAGICBRICKS, input, { maxItems: limit });
      if (items.length > 0) return items.map((item) => mapApifyToListing(item, city));
    } catch (e) {
      if (e instanceof ApifyRentalError) {
        console.log("MagicBricks Apify actor needs rental, falling back to Firecrawl");
      } else {
        console.warn("MagicBricks Apify failed:", e);
      }
    }
  }

  return scrapeViaFirecrawl(city, keywords, limit);
}

function mapApifyToListing(item: any, city: string): PropertyListing {
  const price = item.price || item.Price || item.totalPrice || "";
  const title = item.title || item.Title || item.propertyName || item.name || "";
  const location = item.location || item.locality || item.address || city;
  const sellerName = item.sellerName || item.builderName || item.postedBy || "MagicBricks Listing";

  const sqftRaw = item.superArea || item.builtUpArea || item.carpetArea || item.size || "";
  const bhk = item.bedrooms || item.bhk || "";
  const bhkMatch = (title || "").match(/(\d)\s*BHK/i);

  return {
    id: `mb-${item.id || Buffer.from(item.url || title).toString("base64").slice(0, 12)}`,
    title,
    description: item.description || title,
    price: typeof price === "number" ? formatINR(price) : String(price),
    location,
    area: item.locality || location,
    propertyType: bhk ? `${bhk}BHK` : bhkMatch ? `${bhkMatch[1]}BHK` : "",
    sellerName,
    sellerContact: item.phone || item.mobile || null,
    url: item.url || item.propertyUrl || "",
    postedDate: item.postedDate || new Date().toISOString(),
    sqft: parseSqft(sqftRaw),
    bedrooms: parseBedrooms(bhk || bhkMatch?.[1]),
  };
}

function formatINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} Lac`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function parseSqft(raw: any): number | null {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const m = raw.match(/([\d,]+)/);
    return m ? parseInt(m[1].replace(/,/g, "")) : null;
  }
  return null;
}

function parseBedrooms(raw: any): number | null {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const m = raw.match(/(\d)/);
    return m ? parseInt(m[1]) : null;
  }
  return null;
}

async function scrapeViaFirecrawl(city: string, keywords: string[], limit: number): Promise<PropertyListing[]> {
  const keywordStr = keywords.slice(0, 3).join(" ");
  const query = `site:magicbricks.com ${city} ${keywordStr} property for sale`.trim();
  const results = await searchWeb(query, limit);

  return results
    .filter((r) => r.url?.includes("magicbricks.com"))
    .map((r) => {
      const text = r.markdown ?? "";
      const priceMatch = text.match(/₹\s*[\d,.]+\s*(?:Lac|Lakh|Cr|Crore)?/i) ?? text.match(/Rs\.?\s*[\d,.]+\s*(?:Lac|Lakh|Cr|Crore)?/i);
      const sqftMatch = text.match(/([\d,]+)\s*(?:sq\.?\s*ft|sqft|sft)/i);
      const bhkMatch = text.match(/(\d)\s*BHK/i);

      return {
        id: `mb-${Buffer.from(r.url).toString("base64").slice(0, 12)}`,
        title: r.title?.replace(/ - MagicBricks$/, "") ?? "",
        description: text.slice(0, 1000),
        price: priceMatch?.[0] ?? "",
        location: city,
        area: city,
        propertyType: bhkMatch ? `${bhkMatch[1]}BHK` : "",
        sellerName: "MagicBricks Listing",
        sellerContact: null,
        url: r.url,
        postedDate: new Date().toISOString(),
        sqft: sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, "")) : null,
        bedrooms: bhkMatch ? parseInt(bhkMatch[1]) : null,
      };
    });
}
