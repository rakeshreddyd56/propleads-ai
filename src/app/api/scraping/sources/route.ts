import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { isPlatformAllowed, type PlanTier } from "@/lib/scraping/tiers";

const sourceSchema = z.object({
  platform: z.enum(["REDDIT", "FACEBOOK", "TWITTER", "QUORA", "GOOGLE_MAPS", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER", "COMMONFLOOR", "INSTAGRAM", "LINKEDIN", "YOUTUBE", "TELEGRAM"]),
  identifier: z.string().min(1),
  displayName: z.string().min(1),
  keywords: z.array(z.string()),
  schedule: z.string().default("0 */6 * * *"),
});

const defaultSources = [
  // Reddit — free, no API key needed (public .json endpoints)
  { platform: "REDDIT" as const, identifier: "hyderabad", displayName: "r/hyderabad", keywords: ["flat", "apartment", "property", "2BHK", "3BHK", "buy house", "real estate", "gated community"] },
  { platform: "REDDIT" as const, identifier: "IndianRealEstate", displayName: "r/IndianRealEstate", keywords: ["hyderabad", "gachibowli", "kokapet", "kondapur", "HITEC City", "financial district"] },
  { platform: "REDDIT" as const, identifier: "IndiaInvestments", displayName: "r/IndiaInvestments", keywords: ["hyderabad property", "real estate investment", "apartment hyderabad"] },
  { platform: "REDDIT" as const, identifier: "NRI", displayName: "r/NRI", keywords: ["property hyderabad", "invest hyderabad", "NRI flat", "home india"] },
  { platform: "REDDIT" as const, identifier: "india", displayName: "r/india", keywords: ["hyderabad flat", "buy apartment hyderabad", "property advice hyderabad"] },
  // Facebook Groups — needs Apify
  { platform: "FACEBOOK" as const, identifier: "hyderabadnrirealestateinvestors", displayName: "FB: Hyderabad NRI RE Investors", keywords: ["property", "flat", "investment", "NRI", "hyderabad"] },
  { platform: "FACEBOOK" as const, identifier: "847608352671871", displayName: "FB: Kondapur RE Group", keywords: ["flat", "apartment", "2BHK", "3BHK", "rent", "buy", "kondapur"] },
  // Indian Real Estate Portals — needs Apify
  { platform: "NINETY_NINE_ACRES" as const, identifier: "Hyderabad", displayName: "99acres Hyderabad", keywords: ["hyderabad", "gachibowli", "kokapet", "kondapur", "apartment", "villa"] },
  { platform: "MAGICBRICKS" as const, identifier: "Hyderabad", displayName: "MagicBricks Hyderabad", keywords: ["apartment", "villa", "plot", "gachibowli", "kokapet"] },
  { platform: "NOBROKER" as const, identifier: "Hyderabad", displayName: "NoBroker Hyderabad", keywords: ["hyderabad", "property", "flat", "apartment", "owner"] },
  // Google Maps — needs Apify
  { platform: "GOOGLE_MAPS" as const, identifier: "real estate agents", displayName: "Google Maps RE Agents", keywords: ["real estate", "builder", "property dealer", "hyderabad"] },
  // Social Media — needs Apify
  { platform: "INSTAGRAM" as const, identifier: "hyderabadrealestate", displayName: "IG: #hyderabadrealestate", keywords: ["flat", "apartment", "property", "hyderabad"] },
  { platform: "TWITTER" as const, identifier: "hyderabad property", displayName: "X: Hyderabad Property", keywords: ["hyderabad flat", "buy apartment", "property investment", "real estate hyderabad"] },
  { platform: "YOUTUBE" as const, identifier: "hyderabad property review", displayName: "YT: Property Reviews", keywords: ["hyderabad", "apartment review", "flat tour", "gachibowli", "kokapet"] },
  { platform: "QUORA" as const, identifier: "buy flat hyderabad", displayName: "Quora: Buy Flat Hyderabad", keywords: ["hyderabad", "buy flat", "best area", "property investment"] },
  { platform: "LINKEDIN" as const, identifier: "hyderabad real estate", displayName: "LinkedIn: Hyderabad RE", keywords: ["hyderabad real estate", "property investment", "IT professional"] },
];

export async function GET() {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let sources = await db.scrapingSource.findMany({
    where: { orgId },
    include: { runs: { take: 5, orderBy: { startedAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });

  // Auto-seed default sources for new orgs, or backfill missing platforms
  if (sources.length < defaultSources.length) {
    for (const s of defaultSources) {
      await db.scrapingSource.upsert({
        where: { orgId_platform_identifier: { orgId, platform: s.platform, identifier: s.identifier } },
        update: {},
        create: { orgId, ...s },
      });
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

  try {
    const body = await req.json();
    const data = sourceSchema.parse(body);

    // Check tier allows this platform
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { planTier: true },
    });
    if (!isPlatformAllowed((org?.planTier ?? "FREE") as PlanTier, data.platform)) {
      return NextResponse.json(
        { error: `${data.platform} requires a higher plan. Upgrade to unlock.` },
        { status: 403 }
      );
    }

    const source = await db.scrapingSource.upsert({
      where: { orgId_platform_identifier: { orgId, platform: data.platform, identifier: data.identifier } },
      update: { displayName: data.displayName, keywords: data.keywords },
      create: { orgId, ...data },
    });
    return NextResponse.json(source, { status: 201 });
  } catch (error: any) {
    console.error("Source create error:", error);
    return NextResponse.json({ error: error.message ?? "Failed to create source" }, { status: 400 });
  }
}
