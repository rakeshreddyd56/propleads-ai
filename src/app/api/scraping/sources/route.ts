import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { z } from "zod";

const sourceSchema = z.object({
  platform: z.enum(["REDDIT", "FACEBOOK", "TWITTER", "QUORA", "GOOGLE_MAPS", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER", "COMMONFLOOR", "INSTAGRAM", "LINKEDIN", "YOUTUBE", "TELEGRAM"]),
  identifier: z.string().min(1),
  displayName: z.string().min(1),
  keywords: z.array(z.string()),
  schedule: z.string().default("0 */6 * * *"),
});

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sources = await db.scrapingSource.findMany({
    where: { orgId },
    include: { runs: { take: 5, orderBy: { startedAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sources);
}

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data = sourceSchema.parse(body);

  const source = await db.scrapingSource.create({ data: { orgId, ...data } });
  return NextResponse.json(source, { status: 201 });
}
