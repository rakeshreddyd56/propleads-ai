/**
 * Daily Digest Email — Pro tier only.
 *
 * Aggregates last 24 hours of lead activity and sends a summary email.
 * Triggered by Vercel Cron at 8 AM IST (2:30 AM UTC).
 */

import { db } from "@/lib/db";
import { hasFeature, type PlanTier } from "@/lib/scraping/tiers";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://propleads-ai.vercel.app";

interface DigestData {
  orgName: string;
  period: string;
  hotLeads: DigestLead[];
  warmLeads: DigestLead[];
  coldLeads: DigestLead[];
  totalNew: number;
  totalEnriched: number;
  topMatches: DigestMatch[];
  sourceBreakdown: { platform: string; count: number }[];
}

interface DigestLead {
  id: string;
  name: string | null;
  platform: string;
  score: number;
  budget: string | null;
  preferredArea: string[];
}

interface DigestMatch {
  leadName: string | null;
  propertyName: string;
  matchScore: number;
}

/**
 * Generate and send daily digest for all eligible orgs.
 */
export async function sendAllDigests(): Promise<{ sent: number; skipped: number }> {
  const orgs = await db.organization.findMany({
    where: {
      notifyEmail: { not: null },
      planTier: "PRO",
    },
    select: { id: true, name: true, planTier: true, notifyEmail: true },
  });

  let sent = 0;
  let skipped = 0;

  for (const org of orgs) {
    if (!org.notifyEmail) { skipped++; continue; }
    if (!hasFeature(org.planTier as PlanTier, "daily_digest")) { skipped++; continue; }

    try {
      const data = await generateDigestData(org.id, org.name);
      if (data.totalNew === 0) { skipped++; continue; }
      await sendDigestEmail(org.notifyEmail, data);
      sent++;
    } catch (e) {
      console.error(`Digest failed for org ${org.id}:`, e);
      skipped++;
    }
  }

  return { sent, skipped };
}

/**
 * Generate digest data for a single org.
 */
async function generateDigestData(orgId: string, orgName: string): Promise<DigestData> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = new Date();

  // Get new leads in last 24h
  const newLeads = await db.lead.findMany({
    where: { orgId, createdAt: { gte: since } },
    select: {
      id: true, name: true, platform: true, score: true, tier: true,
      budget: true, preferredArea: true,
    },
    orderBy: { score: "desc" },
  });

  const hot = newLeads.filter((l) => l.tier === "HOT");
  const warm = newLeads.filter((l) => l.tier === "WARM");
  const cold = newLeads.filter((l) => l.tier === "COLD");

  // Enriched count
  const enrichedCount = await db.lead.count({
    where: { orgId, enrichedAt: { gte: since } },
  });

  // Top matches
  const topMatches = await db.leadPropertyMatch.findMany({
    where: {
      lead: { orgId },
      createdAt: { gte: since },
    },
    include: {
      lead: { select: { name: true } },
      property: { select: { name: true } },
    },
    orderBy: { matchScore: "desc" },
    take: 5,
  });

  // Source breakdown
  const platformCounts = new Map<string, number>();
  for (const lead of newLeads) {
    platformCounts.set(lead.platform, (platformCounts.get(lead.platform) ?? 0) + 1);
  }
  const sourceBreakdown = Array.from(platformCounts.entries())
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);

  return {
    orgName,
    period: `${since.toLocaleDateString("en-IN")} – ${now.toLocaleDateString("en-IN")}`,
    hotLeads: hot.slice(0, 10),
    warmLeads: warm.slice(0, 5),
    coldLeads: cold.slice(0, 3),
    totalNew: newLeads.length,
    totalEnriched: enrichedCount,
    topMatches: topMatches.map((m) => ({
      leadName: m.lead.name,
      propertyName: m.property.name,
      matchScore: m.matchScore,
    })),
    sourceBreakdown,
  };
}

/**
 * Send the digest email via Resend.
 */
async function sendDigestEmail(to: string, data: DigestData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("Resend not configured, skipping digest");
    return false;
  }

  const html = buildDigestHtml(data);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "PropLeads <digest@propleads-ai.vercel.app>",
        to,
        subject: `Daily Digest: ${data.totalNew} new leads${data.hotLeads.length > 0 ? ` (${data.hotLeads.length} HOT)` : ""}`,
        html,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("Digest email failed:", e);
    return false;
  }
}

function buildDigestHtml(data: DigestData): string {
  const tierColor = { HOT: "#dc2626", WARM: "#f59e0b", COLD: "#6b7280" };

  function leadRow(lead: DigestLead, tier: string): string {
    const areas = lead.preferredArea?.join(", ") || "—";
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">
          <a href="${BASE_URL}/leads/${lead.id}" style="color:#2563eb;text-decoration:none;font-weight:600;">${lead.name ?? "Unknown"}</a>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">${lead.platform}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center;">
          <span style="background:${tierColor[tier as keyof typeof tierColor] ?? "#6b7280"};color:#fff;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600;">${lead.score}</span>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">${lead.budget ?? "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">${areas}</td>
      </tr>`;
  }

  function leadTable(leads: DigestLead[], tier: string, emoji: string): string {
    if (leads.length === 0) return "";
    return `
      <h3 style="margin:24px 0 8px;font-size:16px;color:${tierColor[tier as keyof typeof tierColor]};">${emoji} ${tier} Leads (${leads.length})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#9ca3af;">Name</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#9ca3af;">Source</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;color:#9ca3af;">Score</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#9ca3af;">Budget</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#9ca3af;">Areas</th>
          </tr>
        </thead>
        <tbody>${leads.map((l) => leadRow(l, tier)).join("")}</tbody>
      </table>`;
  }

  const matchesHtml = data.topMatches.length > 0 ? `
    <h3 style="margin:24px 0 8px;font-size:16px;">Top Property Matches</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#9ca3af;">Lead</th>
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#9ca3af;">Property</th>
          <th style="padding:8px 12px;text-align:center;font-size:12px;color:#9ca3af;">Match</th>
        </tr>
      </thead>
      <tbody>
        ${data.topMatches.map((m) => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${m.leadName ?? "Unknown"}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${m.propertyName}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center;">
              <span style="color:#16a34a;font-weight:700;">${m.matchScore}%</span>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>` : "";

  const sourcesHtml = data.sourceBreakdown.length > 0 ? `
    <h3 style="margin:24px 0 8px;font-size:16px;">Source Breakdown</h3>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      ${data.sourceBreakdown.map((s) => `
        <span style="background:#f3f4f6;padding:4px 12px;border-radius:12px;font-size:13px;">
          ${s.platform}: <strong>${s.count}</strong>
        </span>
      `).join("")}
    </div>` : "";

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:700px;margin:0 auto;color:#1f2937;">
      <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:24px 32px;border-radius:12px 12px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:22px;">PropLeads Daily Digest</h1>
        <p style="color:#94a3b8;margin:4px 0 0;font-size:14px;">${data.orgName} &middot; ${data.period}</p>
      </div>

      <div style="padding:24px 32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <div style="display:flex;gap:16px;margin-bottom:24px;">
          <div style="flex:1;background:#fef2f2;padding:16px;border-radius:8px;text-align:center;">
            <p style="font-size:28px;font-weight:800;color:#dc2626;margin:0;">${data.hotLeads.length}</p>
            <p style="font-size:12px;color:#991b1b;margin:4px 0 0;">HOT Leads</p>
          </div>
          <div style="flex:1;background:#fffbeb;padding:16px;border-radius:8px;text-align:center;">
            <p style="font-size:28px;font-weight:800;color:#d97706;margin:0;">${data.warmLeads.length}</p>
            <p style="font-size:12px;color:#92400e;margin:4px 0 0;">WARM Leads</p>
          </div>
          <div style="flex:1;background:#f0fdf4;padding:16px;border-radius:8px;text-align:center;">
            <p style="font-size:28px;font-weight:800;color:#16a34a;margin:0;">${data.totalEnriched}</p>
            <p style="font-size:12px;color:#166534;margin:4px 0 0;">Enriched</p>
          </div>
          <div style="flex:1;background:#f8fafc;padding:16px;border-radius:8px;text-align:center;">
            <p style="font-size:28px;font-weight:800;color:#475569;margin:0;">${data.totalNew}</p>
            <p style="font-size:12px;color:#64748b;margin:4px 0 0;">Total New</p>
          </div>
        </div>

        ${leadTable(data.hotLeads, "HOT", "🔥")}
        ${leadTable(data.warmLeads, "WARM", "☀️")}
        ${matchesHtml}
        ${sourcesHtml}

        <div style="margin-top:32px;text-align:center;">
          <a href="${BASE_URL}/dashboard" style="display:inline-block;background:#1e293b;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Open Dashboard
          </a>
        </div>

        <p style="margin-top:24px;font-size:11px;color:#9ca3af;text-align:center;">
          You're receiving this because you have a Pro plan with daily digest enabled.
          <br>Manage notifications in <a href="${BASE_URL}/settings/plan" style="color:#6366f1;">Settings</a>.
        </p>
      </div>
    </div>`;
}
