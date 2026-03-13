import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const sourceSchema = z.object({
  platform: z.enum(["REDDIT", "FACEBOOK", "TWITTER", "QUORA", "GOOGLE_MAPS", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER", "COMMONFLOOR", "INSTAGRAM", "LINKEDIN", "YOUTUBE", "TELEGRAM"]),
  identifier: z.string().min(1),
  displayName: z.string().min(1),
  keywords: z.array(z.string()),
  schedule: z.string().default("0 */6 * * *"),
});

const defaultSources = [
  { platform: "REDDIT" as const, identifier: "hyderabad", displayName: "r/hyderabad", keywords: ["flat", "apartment", "property", "2BHK", "3BHK", "buy house", "real estate", "gated community"] },
  { platform: "REDDIT" as const, identifier: "IndianRealEstate", displayName: "r/IndianRealEstate", keywords: ["hyderabad", "gachibowli", "kokapet", "kondapur", "HITEC City", "financial district"] },
  { platform: "REDDIT" as const, identifier: "IndiaInvestments", displayName: "r/IndiaInvestments", keywords: ["hyderabad property", "real estate investment", "apartment hyderabad"] },
  { platform: "REDDIT" as const, identifier: "NRI", displayName: "r/NRI", keywords: ["property hyderabad", "invest hyderabad", "NRI flat", "home india"] },
  { platform: "REDDIT" as const, identifier: "india", displayName: "r/india", keywords: ["hyderabad flat", "buy apartment hyderabad", "property advice hyderabad"] },
];

export async function GET() {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let sources = await db.scrapingSource.findMany({
    where: { orgId },
    include: { runs: { take: 5, orderBy: { startedAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });

  // Auto-seed default Reddit sources for new orgs
  if (sources.length === 0) {
    for (const s of defaultSources) {
      await db.scrapingSource.create({ data: { orgId, ...s } });
    }
    sources = await db.scrapingSource.findMany({
      where: { orgId },
      include: { runs: { take: 5, orderBy: { startedAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    });
  }

  return NextResponse.json(sources);
}

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data = sourceSchema.parse(body);

  const source = await db.scrapingSource.create({ data: { orgId, ...data } });
  return NextResponse.json(source, { status: 201 });
}
