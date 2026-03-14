import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/outreach/email";
import { checkCompliance } from "@/lib/outreach/compliance";

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { leadId, subject, html } = body;
  if (!leadId || typeof leadId !== "string") {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }
  if (!subject || typeof subject !== "string") {
    return NextResponse.json({ error: "subject is required" }, { status: 400 });
  }
  if (!html || typeof html !== "string") {
    return NextResponse.json({ error: "html body is required" }, { status: 400 });
  }

  const lead = await db.lead.findFirst({ where: { id: leadId, orgId } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (!lead.email) {
    return NextResponse.json({ error: "Lead has no email address" }, { status: 400 });
  }

  const compliance = checkCompliance(lead, "EMAIL");
  if (!compliance.allowed) {
    return NextResponse.json({ error: compliance.reason }, { status: 403 });
  }

  // Substitute template variables with lead data
  const vars: Record<string, string> = {
    "{{name}}": lead.name ?? "",
    "{{email}}": lead.email ?? "",
    "{{phone}}": lead.phone ?? "",
    "{{area}}": (lead.preferredArea ?? []).join(", "),
    "{{budget}}": lead.budget ?? "",
  };
  let resolvedSubject = subject;
  let resolvedHtml = html;
  for (const [key, value] of Object.entries(vars)) {
    resolvedSubject = resolvedSubject.replaceAll(key, value);
    resolvedHtml = resolvedHtml.replaceAll(key, value);
  }

  // Append opt-out footer (Issue #28)
  const optOutFooter = `<br/><hr style="margin-top:24px;border:none;border-top:1px solid #ddd"/><p style="font-size:11px;color:#999;margin-top:8px">To opt out of future communications, reply STOP.</p>`;
  resolvedHtml += optOutFooter;

  const result = await sendEmail({ to: lead.email, subject: resolvedSubject, html: resolvedHtml });

  await db.outreachEvent.create({
    data: {
      leadId,
      channel: "EMAIL",
      direction: "OUTBOUND",
      content: resolvedHtml,
      status: result.success ? "SENT" : "FAILED",
      sentAt: result.success ? new Date() : undefined,
      metadata: result as any,
    },
  });

  return NextResponse.json(result);
}
