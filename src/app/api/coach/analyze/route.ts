import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth";
import { analyzeConversation } from "@/lib/ai/conversation-coach";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await resolveAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId, userId } = session;

  const body = await req.json();
  const { conversation, leadId } = body;

  if (!conversation || typeof conversation !== "string") {
    return NextResponse.json({ error: "conversation text is required" }, { status: 400 });
  }

  // If leadId provided, verify it belongs to the caller's org
  if (leadId && typeof leadId !== "string") {
    return NextResponse.json({ error: "leadId must be a string" }, { status: 400 });
  }
  if (leadId) {
    const lead = await db.lead.findFirst({ where: { id: leadId, orgId } });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const analysis = await analyzeConversation(conversation);

  await db.coachSession.create({
    data: {
      userId,
      leadId: leadId ?? null,
      type: "CONVERSATION_ANALYSIS",
      input: conversation,
      response: { analysis },
    },
  });

  return NextResponse.json({ analysis });
}
