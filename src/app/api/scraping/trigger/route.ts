import { NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { inngest } from "@/lib/inngest/client";

export async function POST() {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await inngest.send({ name: "scrape-reddit", data: { orgId } });
  return NextResponse.json({ status: "triggered" });
}
