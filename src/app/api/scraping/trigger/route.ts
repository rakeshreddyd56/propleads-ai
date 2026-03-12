import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { inngest } from "@/lib/inngest/client";

export async function POST() {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await inngest.send({ name: "scrape-reddit", data: { orgId } });
  return NextResponse.json({ status: "triggered" });
}
