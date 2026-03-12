import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generatePlaybook, generateOutreachMessage } from "@/lib/ai/conversation-coach";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.type === "playbook") {
    const playbook = await generatePlaybook({
      leadProfile: body.leadProfile,
      matchedProperty: body.matchedProperty,
      conversationHistory: body.conversationHistory,
    });

    await db.coachSession.create({
      data: {
        userId,
        leadId: body.leadId ?? null,
        type: "PLAYBOOK_GENERATION",
        input: JSON.stringify(body),
        response: { playbook },
      },
    });

    return NextResponse.json({ playbook });
  }

  if (body.type === "message") {
    const message = await generateOutreachMessage({
      persona: body.persona,
      property: body.property,
      channel: body.channel,
      stage: body.stage,
    });

    return NextResponse.json({ message });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
