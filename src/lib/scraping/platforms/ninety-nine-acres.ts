import { searchWeb } from "../firecrawl";
import {
  runApifyActor, APIFY_ACTORS, format99AcresInput,
  isApifyConfigured, ApifyRentalError,
} from "../apify";

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
 * Scrape 99acres property listings.
 * Primary: Apify actor (structured data with price, location, seller info).
 * Fallback: Firecrawl web search (regex parsing).
 */
export async function scrape99Acres(
  city: string,
  keywords: string[],
  limit = 10
): Promise<PropertyListing[]> {
  // Strategy 1: Apify actor (Starter+ tier — needs monthly rental)
  if (isApifyConfigured()) {
    try {
      const input = format99AcresInput(city, keywords, limit);
      const items = await runApifyActor(APIFY_ACTORS.NINETY_NINE_ACRES, input, { maxItems: limit });
      if (items.length > 0) return items.map(mapApifyToListing);
    } catch (e) {
      if (e instanceof ApifyRentalError) {
        console.log("99acres Apify actor needs rental, falling back to Firecrawl");
      } else {
        console.warn("99acres Apify failed:", e);
      }
    }
  }

  // Strategy 2: Firecrawl web search fallback
  return scrapeViaFirecrawl(city, keywords, limit);
}

function mapApifyToListing(item: any): PropertyListing {
  // 99acres actor returns structured fields — map whatever fields exist
  const price = item.price || item.Price || item.totalPrice || "";
  const title = item.title || item.Title || item.projectName || item.name || "";
  const location = item.location || item.Location || item.locality || item.address || "";
  const area = item.area || item.locality || item.micromarket || location;
  const sqftRaw = item.superArea || item.builtUpArea || item.carpetArea || item.area_sqft || "";
  const bedroomRaw = item.bedrooms || item.bhk || item.Bedrooms || "";
  const sellerName = item.sellerName || item.advertiserName || item.postedBy || item.agent_name || "99acres Listing";

  return {
    id: `99a-${item.id || Buffer.from(item.url || title).toString("base64").slice(0, 12)}`,
    title,
    description: item.description || item.Description || title,
    price: typeof price === "number" ? formatINRPrice(price) : String(price),
    location,
    area,
    propertyType: extractPropertyType(item),
    sellerName,
    sellerContact: item.sellerContact || item.phone || item.mobile || null,
    url: item.url || item.propertyUrl || item.link || "",
    postedDate: item.postedDate || item.publishedDate || new Date().toISOString(),
    sqft: parseSqft(sqftRaw),
    bedrooms: parseBedrooms(bedroomRaw),
  };
}

function formatINRPrice(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} Lac`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function extractPropertyType(item: any): string {
  if (item.propertyType) return item.propertyType;
  const bhk = item.bedrooms || item.bhk;
  if (bhk) return `${bhk}BHK`;
  // Try to extract from title
  const bhkMatch = (item.title || "").match(/(\d)\s*BHK/i);
  return bhkMatch ? `${bhkMatch[1]}BHK` : "";
}

function parseSqft(raw: any): number | null {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const match = raw.match(/([\d,]+)/);
    return match ? parseInt(match[1].replace(/,/g, "")) : null;
  }
  return null;
}

function parseBedrooms(raw: any): number | null {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const match = raw.match(/(\d)/);
    return match ? parseInt(match[1]) : null;
  }
  return null;
}

async function scrapeViaFirecrawl(city: string, keywords: string[], limit: number): Promise<PropertyListing[]> {
  const keywordStr = keywords.slice(0, 3).join(" ");
  const query = `site:99acres.com ${city} ${keywordStr} buy flat apartment`.trim();
  const results = await searchWeb(query, limit);

  return results
    .filter((r) => r.url?.includes("99acres.com"))
    .map((r) => {
      const text = r.markdown ?? "";
      const priceMatch = text.match(/₹\s*[\d,.]+\s*(?:Lac|Lakh|Cr|Crore)?/i) ?? text.match(/Rs\.?\s*[\d,.]+\s*(?:Lac|Lakh|Cr|Crore)?/i);
      const sqftMatch = text.match(/([\d,]+)\s*(?:sq\.?\s*ft|sqft|sft)/i);
      const bhkMatch = text.match(/(\d)\s*BHK/i);

      return {
        id: `99a-${Buffer.from(r.url).toString("base64").slice(0, 12)}`,
        title: r.title?.replace(/ - 99acres\.com$/, "") ?? "",
        description: text.slice(0, 1000),
        price: priceMatch?.[0] ?? "",
        location: city,
        area: city,
        propertyType: bhkMatch ? `${bhkMatch[1]}BHK` : "",
        sellerName: "99acres Listing",
        sellerContact: null,
        url: r.url,
        postedDate: new Date().toISOString(),
        sqft: sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, "")) : null,
        bedrooms: bhkMatch ? parseInt(bhkMatch[1]) : null,
      };
    });
}
