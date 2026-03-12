import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { extractFromBrochure } from "@/lib/ai/brochure-extractor";

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const { blobUrl, extracted } = await extractFromBrochure(file);
  return NextResponse.json({ blobUrl, extracted });
}
