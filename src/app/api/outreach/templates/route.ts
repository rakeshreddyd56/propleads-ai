import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1),
  channel: z.enum(["WHATSAPP", "EMAIL", "SMS", "INSTAGRAM_DM", "PHONE_CALL"]),
  category: z.enum(["FIRST_CONTACT", "BROCHURE_SHARE", "SITE_VISIT", "FOLLOW_UP", "PRICE_UPDATE", "MARKET_UPDATE", "NRI_SPECIFIC", "TESTIMONIAL"]),
  subject: z.string().optional(),
  body: z.string().min(1),
  variables: z.array(z.string()).default([]),
});

export async function GET() {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await db.messageTemplate.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data = templateSchema.parse(body);

  const template = await db.messageTemplate.create({ data: { orgId, ...data } });
  return NextResponse.json(template, { status: 201 });
}
