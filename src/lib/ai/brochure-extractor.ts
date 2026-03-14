import { anthropic } from "@/lib/claude";
import { put } from "@vercel/blob";

export interface ExtractedProperty {
  name: string;
  builderName: string;
  reraNumber: string | null;
  location: string;
  area: string;
  propertyType: "APARTMENT" | "VILLA" | "PLOT" | "COMMERCIAL" | "PENTHOUSE" | "INDEPENDENT_HOUSE";
  unitTypes: { type: string; sizeSqft: number; priceINR: number }[];
  amenities: string[];
  usps: string[];
  possessionDate: string | null;
  description: string;
}

export async function extractFromBrochure(file: File): Promise<{
  blobUrl: string;
  extracted: ExtractedProperty;
}> {
  const blob = await put(`brochures/${Date.now()}-${file.name}`, file, { access: "public" });

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mediaType = file.type as "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

  const isPdf = file.type === "application/pdf";
  const contentBlock = isPdf
    ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } }
    : { type: "image" as const, source: { type: "base64" as const, media_type: mediaType as "image/jpeg" | "image/png" | "image/webp", data: base64 } };

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          {
            type: "text",
            text: `Extract all property details from this real estate brochure. Return JSON:
{
  "name": "project name",
  "builderName": "developer/builder name",
  "reraNumber": "RERA registration number or null",
  "location": "full address",
  "area": "micro-market name (e.g. Gachibowli, Kokapet, Kondapur)",
  "propertyType": "APARTMENT | VILLA | PLOT | COMMERCIAL | PENTHOUSE | INDEPENDENT_HOUSE",
  "unitTypes": [{"type": "2BHK", "sizeSqft": 1200, "priceINR": 7500000}],
  "amenities": ["swimming pool", "gym", ...],
  "usps": ["Vastu compliant", "5 min from IT hub", ...],
  "possessionDate": "YYYY-MM or null",
  "description": "2-3 sentence summary"
}
Respond with valid JSON only.`,
          },
        ],
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  const extracted: ExtractedProperty = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());

  return { blobUrl: blob.url, extracted };
}
