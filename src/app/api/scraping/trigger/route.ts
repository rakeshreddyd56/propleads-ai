import { NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { inngest } from "@/lib/inngest/client";

export async function POST() {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.INNGEST_EVENT_KEY) {
    return NextResponse.json(
      { error: "Scraping not configured. Set INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY in environment variables." },
      { status: 503 }
    );
  }

  try {
    await inngest.send({ name: "scrape-reddit", data: { orgId } });
    return NextResponse.json({ status: "triggered" });
  } catch (error: any) {
    console.error("Scraping trigger error:", error);
    return NextResponse.json({ error: error.message ?? "Failed to trigger scraping" }, { status: 500 });
  }
}
