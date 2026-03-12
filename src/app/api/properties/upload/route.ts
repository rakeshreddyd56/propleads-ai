import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { anthropic } from "@/lib/claude";
import type { ExtractedProperty } from "@/lib/ai/brochure-extractor";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { blobUrl, fileName, fileType } = await req.json();
  if (!blobUrl) return NextResponse.json({ error: "No blob URL provided" }, { status: 400 });

  // Fetch the file from Blob storage for AI analysis
  const fileRes = await fetch(blobUrl);
  const arrayBuffer = await fileRes.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  const isPdf = fileType === "application/pdf";
  const contentBlock = isPdf
    ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } }
    : { type: "image" as const, source: { type: "base64" as const, media_type: fileType as "image/jpeg" | "image/png" | "image/webp", data: base64 } };

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

  return NextResponse.json({ blobUrl, extracted });
}
