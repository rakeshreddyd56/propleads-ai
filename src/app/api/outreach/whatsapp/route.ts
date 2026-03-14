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

  // Substitute template variables in parameters array with lead data
  const vars: Record<string, string> = {
    "{{name}}": lead.name ?? "",
    "{{email}}": lead.email ?? "",
    "{{phone}}": lead.phone ?? "",
    "{{area}}": (lead.preferredArea ?? []).join(", "),
    "{{budget}}": lead.budget ?? "",
  };
  const resolvedParameters = Array.isArray(parameters)
    ? parameters.map((param: string) => {
        let resolved = param;
        for (const [key, value] of Object.entries(vars)) {
          resolved = resolved.replaceAll(key, value);
        }
        return resolved;
      })
    : parameters;

  // Append opt-out instruction to last parameter (or add one) for compliance
  const finalParameters = Array.isArray(resolvedParameters) && resolvedParameters.length > 0
    ? [...resolvedParameters.slice(0, -1), `${resolvedParameters[resolvedParameters.length - 1]}\n\nReply STOP to opt out.`]
    : resolvedParameters;

  const result = await sendWhatsAppTemplate({
    phoneNumber: lead.phone,
    templateName,
    parameters: finalParameters,
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
