import { Resend } from "resend";
import { gatherDigestData, getDigestEligibleOrgs } from "./gather";
import { buildDigestHtml, buildDigestSubject, buildDigestPreviewText } from "./template";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_ADDRESS = process.env.DIGEST_FROM_EMAIL ?? "PropLeads AI <digest@propleads.ai>";

export interface DigestSendResult {
  orgId: string;
  email: string;
  success: boolean;
  emailId?: string;
  error?: string;
  leadsCount: number;
}

/**
 * Sends a digest email for a single organization.
 */
export async function sendDigestForOrg(orgId: string): Promise<DigestSendResult | null> {
  const data = await gatherDigestData(orgId);
  if (!data) return null;

  // Skip orgs with no activity and no leads — configurable via env
  const skipEmpty = process.env.DIGEST_SKIP_EMPTY !== "false";
  if (skipEmpty && data.leads.total === 0) {
    return {
      orgId,
      email: data.notifyEmail,
      success: true,
      leadsCount: 0,
      error: "skipped_no_activity",
    };
  }

  const subject = buildDigestSubject(data);
  const html = buildDigestHtml(data);
  const previewText = buildDigestPreviewText(data);

  try {
    const resend = getResend();
    const { data: result, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: data.notifyEmail,
      subject,
      html,
      headers: {
        "X-Entity-Ref-ID": `digest-${orgId}-${new Date().toISOString().split("T")[0]}`,
        "List-Unsubscribe": `<${process.env.NEXT_PUBLIC_APP_URL ?? "https://propleads-ai.vercel.app"}/settings?unsubscribe=digest>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: [
        { name: "type", value: "daily-digest" },
        { name: "org_id", value: orgId },
      ],
    });

    if (error) {
      console.error(`[Digest] Failed for org ${orgId}:`, error);
      return {
        orgId,
        email: data.notifyEmail,
        success: false,
        error: error.message,
        leadsCount: data.leads.total,
      };
    }

    console.log(`[Digest] Sent to ${data.notifyEmail} for org ${data.orgName} (${data.leads.total} leads)`);
    return {
      orgId,
      email: data.notifyEmail,
      success: true,
      emailId: result?.id,
      leadsCount: data.leads.total,
    };
  } catch (err: any) {
    console.error(`[Digest] Exception for org ${orgId}:`, err);
    return {
      orgId,
      email: data.notifyEmail,
      success: false,
      error: err.message,
      leadsCount: data.leads.total,
    };
  }
}

/**
 * Sends digest emails to ALL eligible organizations.
 * Called by the cron API route.
 */
export async function sendAllDigests(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  results: DigestSendResult[];
}> {
  const orgIds = await getDigestEligibleOrgs();

  const results: DigestSendResult[] = [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // Process sequentially to respect Resend rate limits (2/sec on free tier)
  for (const orgId of orgIds) {
    const result = await sendDigestForOrg(orgId);
    if (!result) {
      skipped++;
      continue;
    }
    results.push(result);
    if (result.error === "skipped_no_activity") {
      skipped++;
    } else if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { processed: orgIds.length, sent, failed, skipped, results };
}
