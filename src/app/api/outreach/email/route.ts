import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/outreach/email";
import { checkCompliance } from "@/lib/outreach/compliance";

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { leadId, subject, html } = await req.json();
  const lead = await db.lead.findFirst({ where: { id: leadId, orgId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const compliance = checkCompliance(lead, "EMAIL");
  if (!compliance.allowed) {
    return NextResponse.json({ error: compliance.reason }, { status: 403 });
  }

  const result = await sendEmail({ to: lead.email!, subject, html });

  await db.outreachEvent.create({
    data: {
      leadId,
      channel: "EMAIL",
      direction: "OUTBOUND",
      content: html,
      status: result.success ? "SENT" : "FAILED",
      sentAt: result.success ? new Date() : undefined,
      metadata: result as any,
    },
  });

  return NextResponse.json(result);
}
