import { searchWeb } from "../firecrawl";
import type { PropertyListing } from "./ninety-nine-acres";

export async function scrapeMagicBricks(
  city: string,
  keywords: string[],
  limit = 10
): Promise<PropertyListing[]> {
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
