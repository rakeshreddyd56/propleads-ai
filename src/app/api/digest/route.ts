import { NextResponse } from "next/server";
import { sendAllDigests } from "@/lib/digest";

export const maxDuration = 60;

/**
 * GET /api/digest — triggered by Vercel Cron at 2:30 AM UTC (8 AM IST)
 * Sends daily digest emails to all Pro orgs with notifyEmail configured.
 */
export async function GET() {
  try {
    const result = await sendAllDigests();
    console.log(`[Digest] Complete: ${result.sent} sent, ${result.skipped} skipped`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Digest cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
