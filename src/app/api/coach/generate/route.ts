import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/auth";
import { generatePlaybook, generateOutreachMessage } from "@/lib/ai/conversation-coach";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await resolveAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orgId, userId } = session;

  const body = await req.json();
  const validTypes = ["playbook", "message"];
  if (!body.type || !validTypes.includes(body.type)) {
    return NextResponse.json({ error: "Invalid type. Must be 'playbook' or 'message'." }, { status: 400 });
  }

  if (body.type === "playbook") {
    // Verify lead belongs to caller's org if provided
    if (body.leadId && typeof body.leadId !== "string") {
      return NextResponse.json({ error: "leadId must be a string" }, { status: 400 });
    }
    if (body.leadId) {
      const lead = await db.lead.findFirst({ where: { id: body.leadId, orgId } });
      if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

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
