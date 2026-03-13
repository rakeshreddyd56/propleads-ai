import { searchWeb } from "../firecrawl";
import {
  runApifyActor, APIFY_ACTORS, formatNoBrokerInput,
  isApifyConfigured, ApifyRentalError,
} from "../apify";
import type { PropertyListing } from "./ninety-nine-acres";

/**
 * Scrape NoBroker property listings (direct owner listings).
 * Primary: Apify actor. Fallback: Firecrawl.
 */
export async function scrapeNoBroker(
  city: string,
  keywords: string[],
  limit = 10
): Promise<PropertyListing[]> {
  if (isApifyConfigured()) {
    try {
      const input = formatNoBrokerInput(city, keywords, limit);
      const items = await runApifyActor(APIFY_ACTORS.NOBROKER, input, { maxItems: limit });
      if (items.length > 0) return items.map((item) => mapApifyToListing(item, city));
    } catch (e) {
      if (e instanceof ApifyRentalError) {
        console.log("NoBroker Apify actor needs rental, falling back to Firecrawl");
      } else {
        console.warn("NoBroker Apify failed:", e);
      }
    }
  }

  return scrapeViaFirecrawl(city, keywords, limit);
}

function mapApifyToListing(item: any, city: string): PropertyListing {
  const price = item.price || item.rent || item.totalPrice || "";
  const title = item.title || item.propertyTitle || item.name || "";
  const location = item.location || item.locality || item.address || city;
  // NoBroker is owner-direct — seller is always the owner
  const sellerName = item.ownerName || item.name || item.contactName || "NoBroker Owner";

  const sqftRaw = item.superArea || item.builtUpArea || item.carpetArea || item.size || "";
  const bhk = item.bedrooms || item.bhk || "";
  const bhkMatch = (title || "").match(/(\d)\s*BHK/i);

  return {
    id: `nb-${item.id || Buffer.from(item.url || title).toString("base64").slice(0, 12)}`,
    title,
    description: item.description || item.detailDescription || title,
    price: typeof price === "number" ? formatINR(price) : String(price),
    location,
    area: item.locality || item.nearbyPlace || location,
    propertyType: bhk ? `${bhk}BHK` : bhkMatch ? `${bhkMatch[1]}BHK` : "",
    sellerName,
    sellerContact: item.ownerPhone || item.phone || item.mobile || null,
    url: item.url || item.propertyUrl || "",
    postedDate: item.postedDate || item.listedDate || new Date().toISOString(),
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
  const query = `site:nobroker.in ${city} ${keywordStr} flat apartment owner`.trim();
  const results = await searchWeb(query, limit);

  return results
    .filter((r) => r.url?.includes("nobroker.in"))
    .map((r) => {
      const text = r.markdown ?? "";
      const priceMatch = text.match(/₹\s*[\d,.]+\s*(?:Lac|Lakh|Cr|Crore)?/i) ?? text.match(/Rs\.?\s*[\d,.]+\s*(?:Lac|Lakh|Cr|Crore)?/i);
      const sqftMatch = text.match(/([\d,]+)\s*(?:sq\.?\s*ft|sqft|sft)/i);
      const bhkMatch = text.match(/(\d)\s*BHK/i);

      return {
        id: `nb-${Buffer.from(r.url).toString("base64").slice(0, 12)}`,
        title: r.title?.replace(/ - NoBroker$/, "") ?? "",
        description: text.slice(0, 1000),
        price: priceMatch?.[0] ?? "",
        location: city,
        area: city,
        propertyType: bhkMatch ? `${bhkMatch[1]}BHK` : "",
        sellerName: "NoBroker Owner",
        sellerContact: null,
        url: r.url,
        postedDate: new Date().toISOString(),
        sqft: sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, "")) : null,
        bedrooms: bhkMatch ? parseInt(bhkMatch[1]) : null,
      };
    });
}
