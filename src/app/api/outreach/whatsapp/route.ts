import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sendWhatsAppTemplate } from "@/lib/outreach/whatsapp";
import { checkCompliance } from "@/lib/outreach/compliance";

export async function POST(req: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId, templateName, parameters, mediaUrl } = await req.json();
  const lead = await db.lead.findFirst({ where: { id: leadId, orgId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const compliance = checkCompliance(lead, "WHATSAPP");
  if (!compliance.allowed) {
    return NextResponse.json({ error: compliance.reason }, { status: 403 });
  }

  const result = await sendWhatsAppTemplate({
    phoneNumber: lead.phone!,
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
