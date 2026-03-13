import { searchWeb } from "../firecrawl";

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

export async function scrape99Acres(
  city: string,
  keywords: string[],
  limit = 10
): Promise<PropertyListing[]> {
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
