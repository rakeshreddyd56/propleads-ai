import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendWhatsAppTemplate } from "@/lib/outreach/whatsapp";
import { checkCompliance } from "@/lib/outreach/compliance";

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { leadId, templateName, parameters, mediaUrl } = body;
  if (!leadId || typeof leadId !== "string") {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }
  if (!templateName || typeof templateName !== "string") {
    return NextResponse.json({ error: "templateName is required" }, { status: 400 });
  }

  const lead = await db.lead.findFirst({ where: { id: leadId, orgId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (!lead.phone) {
    return NextResponse.json({ error: "Lead has no phone number" }, { status: 400 });
  }

  const compliance = checkCompliance(lead, "WHATSAPP");
  if (!compliance.allowed) {
    return NextResponse.json({ error: compliance.reason }, { status: 403 });
  }

  const result = await sendWhatsAppTemplate({
    phoneNumber: lead.phone,
    templateName,
    parameters,
    mediaUrl,
  });

  await db.outreachEvent.create({
    data: {
      leadId,
      channel: "WHATSAPP",
      direction: "OUTBOUND",
      content: `Template: ${templateName}`,
      status: result.success ? "SENT" : "FAILED",
      sentAt: result.success ? new Date() : undefined,
      metadata: result as any,
    },
  });

  return NextResponse.json(result);
}
