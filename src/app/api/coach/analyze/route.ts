import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { analyzeConversation } from "@/lib/ai/conversation-coach";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversation, leadId } = await req.json();
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
