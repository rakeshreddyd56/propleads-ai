import type { DigestData, DigestLeadSummary, DigestTopMatch, DigestSourcePerformance } from "./gather";
import { format } from "date-fns";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://propleads-ai.vercel.app";

// ─── Color palette ──────────────────────────────────────────────────────────
const COLORS = {
  bg: "#f8fafc",
  cardBg: "#ffffff",
  border: "#e2e8f0",
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  brandPrimary: "#2563eb",
  brandDark: "#1e40af",
  hot: "#dc2626",
  hotBg: "#fef2f2",
  hotBorder: "#fecaca",
  warm: "#f59e0b",
  warmBg: "#fffbeb",
  warmBorder: "#fde68a",
  cold: "#6366f1",
  coldBg: "#eef2ff",
  coldBorder: "#c7d2fe",
  green: "#16a34a",
  greenBg: "#f0fdf4",
};

// ─── Utility ────────────────────────────────────────────────────────────────
function tierColor(tier: string) {
  if (tier === "HOT") return { text: COLORS.hot, bg: COLORS.hotBg, border: COLORS.hotBorder };
  if (tier === "WARM") return { text: COLORS.warm, bg: COLORS.warmBg, border: COLORS.warmBorder };
  return { text: COLORS.cold, bg: COLORS.coldBg, border: COLORS.coldBorder };
}

function platformLabel(platform: string): string {
  return platform
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Sections ───────────────────────────────────────────────────────────────

function renderKpiCard(label: string, value: string | number, color: string): string {
  return `
    <td style="padding: 0 6px;">
      <div style="background: ${COLORS.cardBg}; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 16px 20px; text-align: center; min-width: 120px;">
        <div style="font-size: 28px; font-weight: 700; color: ${color}; line-height: 1.2;">${value}</div>
        <div style="font-size: 12px; color: ${COLORS.textSecondary}; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${label}</div>
      </div>
    </td>`;
}

function renderKpiRow(data: DigestData): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        ${renderKpiCard("New Leads", data.leads.total, COLORS.brandPrimary)}
        ${renderKpiCard("HOT", data.leads.hot.length, COLORS.hot)}
        ${renderKpiCard("Enriched", data.enrichment.enrichedCount, COLORS.green)}
        ${renderKpiCard("All-time", data.kpis.totalLeadsAllTime, COLORS.textPrimary)}
      </tr>
    </table>`;
}

function renderLeadRow(lead: DigestLeadSummary): string {
  const tc = tierColor(lead.tier);
  const areas = lead.preferredArea.length > 0 ? lead.preferredArea.slice(0, 2).join(", ") : "—";
  return `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid ${COLORS.border};">
        <a href="${BASE_URL}/leads/${lead.id}" style="color: ${COLORS.brandPrimary}; text-decoration: none; font-weight: 600;">${lead.name ?? "Unknown"}</a>
        <div style="font-size: 12px; color: ${COLORS.textSecondary}; margin-top: 2px;">${platformLabel(lead.platform)} &middot; ${areas}</div>
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid ${COLORS.border}; text-align: center;">
        <span style="display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: ${tc.bg}; color: ${tc.text}; border: 1px solid ${tc.border};">${lead.tier}</span>
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid ${COLORS.border}; text-align: center; font-weight: 600; color: ${COLORS.textPrimary};">${lead.score}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid ${COLORS.border}; text-align: right; font-size: 13px; color: ${COLORS.textSecondary};">${lead.budget ?? "—"}</td>
    </tr>`;
}

function renderLeadTierSection(tier: string, leads: DigestLeadSummary[]): string {
  if (leads.length === 0) return "";
  const tc = tierColor(tier);
  return `
    <div style="margin-bottom: 24px;">
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${tc.text}; margin-right: 8px;"></span>
        <span style="font-size: 16px; font-weight: 700; color: ${COLORS.textPrimary};">${tier} Leads</span>
        <span style="font-size: 14px; color: ${COLORS.textSecondary}; margin-left: 8px;">(${leads.length})</span>
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid ${COLORS.border}; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: ${COLORS.bg};">
            <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: ${COLORS.textMuted}; letter-spacing: 0.5px;">Lead</th>
            <th style="padding: 8px 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: ${COLORS.textMuted}; letter-spacing: 0.5px;">Tier</th>
            <th style="padding: 8px 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: ${COLORS.textMuted}; letter-spacing: 0.5px;">Score</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 11px; text-transform: uppercase; color: ${COLORS.textMuted}; letter-spacing: 0.5px;">Budget</th>
          </tr>
        </thead>
        <tbody>
          ${leads.slice(0, 10).map(renderLeadRow).join("")}
        </tbody>
      </table>
      ${leads.length > 10 ? `<p style="font-size: 13px; color: ${COLORS.textSecondary}; margin-top: 8px;">+ ${leads.length - 10} more ${tier.toLowerCase()} leads</p>` : ""}
    </div>`;
}

function renderTopMatches(matches: DigestTopMatch[]): string {
  if (matches.length === 0) return "";
  return `
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 18px; font-weight: 700; color: ${COLORS.textPrimary}; margin: 0 0 12px 0;">Top Property Matches</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid ${COLORS.border}; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: ${COLORS.bg};">
            <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: ${COLORS.textMuted};">Lead</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: ${COLORS.textMuted};">Property</th>
            <th style="padding: 8px 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: ${COLORS.textMuted};">Match %</th>
          </tr>
        </thead>
        <tbody>
          ${matches
            .map(
              (m) => `
            <tr>
              <td style="padding: 10px 12px; border-bottom: 1px solid ${COLORS.border};">
                <a href="${BASE_URL}/leads/${m.leadId}" style="color: ${COLORS.brandPrimary}; text-decoration: none;">${m.leadName ?? "Unknown"}</a>
              </td>
              <td style="padding: 10px 12px; border-bottom: 1px solid ${COLORS.border};">
                <a href="${BASE_URL}/properties/${m.propertyId}" style="color: ${COLORS.brandPrimary}; text-decoration: none;">${m.propertyName}</a>
              </td>
              <td style="padding: 10px 12px; border-bottom: 1px solid ${COLORS.border}; text-align: center;">
                <span style="display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 13px; font-weight: 600; background: ${COLORS.greenBg}; color: ${COLORS.green};">${m.matchScore}%</span>
              </td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

function renderEnrichmentSummary(data: DigestData): string {
  const { enrichment } = data;
  if (enrichment.enrichedCount === 0 && enrichment.totalNewLeads === 0) return "";
  const rate =
    enrichment.totalNewLeads > 0
      ? Math.round((enrichment.enrichedCount / enrichment.totalNewLeads) * 100)
      : 0;
  return `
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 18px; font-weight: 700; color: ${COLORS.textPrimary}; margin: 0 0 12px 0;">Enrichment Results</h2>
      <div style="background: ${COLORS.cardBg}; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 16px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 4px 0; font-size: 14px; color: ${COLORS.textSecondary};">Leads enriched</td>
            <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: ${COLORS.textPrimary}; text-align: right;">${enrichment.enrichedCount} / ${enrichment.totalNewLeads}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-size: 14px; color: ${COLORS.textSecondary};">Enrichment rate</td>
            <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: ${COLORS.green}; text-align: right;">${rate}%</td>
          </tr>
          ${
            enrichment.topSources.length > 0
              ? `<tr>
                  <td style="padding: 4px 0; font-size: 14px; color: ${COLORS.textSecondary};">Sources used</td>
                  <td style="padding: 4px 0; font-size: 14px; color: ${COLORS.textPrimary}; text-align: right;">${enrichment.topSources.join(", ")}</td>
                </tr>`
              : ""
          }
        </table>
      </div>
    </div>`;
}

function renderSourcePerformance(sources: DigestSourcePerformance[]): string {
  if (sources.length === 0) return "";
  return `
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 18px; font-weight: 700; color: ${COLORS.textPrimary}; margin: 0 0 12px 0;">Source Performance</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid ${COLORS.border}; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: ${COLORS.bg};">
            <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: ${COLORS.textMuted};">Platform</th>
            <th style="padding: 8px 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: ${COLORS.textMuted};">Leads Found</th>
            <th style="padding: 8px 12px; text-align: center; font-size: 11px; text-transform: uppercase; color: ${COLORS.textMuted};">Avg Score</th>
          </tr>
        </thead>
        <tbody>
          ${sources
            .map(
              (s) => `
            <tr>
              <td style="padding: 10px 12px; border-bottom: 1px solid ${COLORS.border}; font-weight: 600; color: ${COLORS.textPrimary};">${platformLabel(s.platform)}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid ${COLORS.border}; text-align: center; color: ${COLORS.textPrimary};">${s.leadsFound}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid ${COLORS.border}; text-align: center; color: ${COLORS.textSecondary};">${s.avgScore}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

function renderQuickActions(): string {
  return `
    <div style="margin-bottom: 24px; text-align: center;">
      <h2 style="font-size: 18px; font-weight: 700; color: ${COLORS.textPrimary}; margin: 0 0 16px 0;">Quick Actions</h2>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td style="padding: 0 6px;">
            <a href="${BASE_URL}/dashboard" style="display: inline-block; padding: 10px 20px; background: ${COLORS.brandPrimary}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">Dashboard</a>
          </td>
          <td style="padding: 0 6px;">
            <a href="${BASE_URL}/leads?tier=HOT" style="display: inline-block; padding: 10px 20px; background: ${COLORS.hot}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">HOT Leads</a>
          </td>
          <td style="padding: 0 6px;">
            <a href="${BASE_URL}/analytics" style="display: inline-block; padding: 10px 20px; background: ${COLORS.cardBg}; color: ${COLORS.brandPrimary}; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; border: 1px solid ${COLORS.brandPrimary};">Analytics</a>
          </td>
          <td style="padding: 0 6px;">
            <a href="${BASE_URL}/scraping" style="display: inline-block; padding: 10px 20px; background: ${COLORS.cardBg}; color: ${COLORS.textPrimary}; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; border: 1px solid ${COLORS.border};">Scraping</a>
          </td>
        </tr>
      </table>
    </div>`;
}

// ─── Main Template ──────────────────────────────────────────────────────────

export function buildDigestSubject(data: DigestData): string {
  const hotCount = data.leads.hot.length;
  const total = data.leads.total;
  const dateStr = format(data.period.to, "MMM d");

  if (hotCount > 0) {
    return `${hotCount} HOT lead${hotCount > 1 ? "s" : ""} + ${total} total new leads — ${dateStr}`;
  }
  if (total > 0) {
    return `${total} new lead${total > 1 ? "s" : ""} found today — ${dateStr}`;
  }
  return `Daily Digest — ${dateStr} — No new leads`;
}

export function buildDigestPreviewText(data: DigestData): string {
  const parts: string[] = [];
  if (data.leads.hot.length > 0) parts.push(`${data.leads.hot.length} HOT`);
  if (data.leads.warm.length > 0) parts.push(`${data.leads.warm.length} WARM`);
  if (data.leads.cold.length > 0) parts.push(`${data.leads.cold.length} COLD`);
  if (data.topMatches.length > 0) parts.push(`${data.topMatches.length} property matches`);
  return parts.length > 0 ? parts.join(" | ") : "Your daily PropLeads summary";
}

export function buildDigestHtml(data: DigestData): string {
  const dateRange = `${format(data.period.from, "MMM d, h:mm a")} — ${format(data.period.to, "MMM d, h:mm a")}`;
  const previewText = buildDigestPreviewText(data);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>PropLeads Daily Digest</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">

  <!-- Preview text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${previewText}
    ${"&nbsp;&zwnj;".repeat(30)}
  </div>

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.bg};">
    <tr>
      <td align="center" style="padding: 32px 16px;">

        <!-- Main container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; background: ${COLORS.cardBg}; border-radius: 12px; border: 1px solid ${COLORS.border}; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${COLORS.brandPrimary}, ${COLORS.brandDark}); padding: 32px 32px 24px;">
              <h1 style="margin: 0 0 4px 0; font-size: 24px; font-weight: 700; color: #ffffff;">PropLeads Daily Digest</h1>
              <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.8);">${data.orgName} &middot; ${dateRange}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 24px 32px 32px;">

              ${data.leads.total === 0
                ? `<div style="text-align: center; padding: 32px 0;">
                    <p style="font-size: 16px; color: ${COLORS.textSecondary};">No new leads in the last 24 hours.</p>
                    <p style="font-size: 14px; color: ${COLORS.textMuted};">Check your scraping sources or adjust keywords to capture more leads.</p>
                    <a href="${BASE_URL}/scraping" style="display: inline-block; margin-top: 12px; padding: 10px 24px; background: ${COLORS.brandPrimary}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Review Sources</a>
                  </div>`
                : `
                  <!-- KPIs -->
                  ${renderKpiRow(data)}

                  <!-- Lead sections by tier -->
                  <h2 style="font-size: 18px; font-weight: 700; color: ${COLORS.textPrimary}; margin: 0 0 16px 0;">New Leads by Tier</h2>
                  ${renderLeadTierSection("HOT", data.leads.hot)}
                  ${renderLeadTierSection("WARM", data.leads.warm)}
                  ${renderLeadTierSection("COLD", data.leads.cold)}

                  <!-- Top matches -->
                  ${renderTopMatches(data.topMatches)}

                  <!-- Enrichment -->
                  ${renderEnrichmentSummary(data)}

                  <!-- Source performance -->
                  ${renderSourcePerformance(data.sourcePerformance)}

                  <!-- Quick actions -->
                  ${renderQuickActions()}
                `
              }

              <!-- All-time stats footer -->
              <div style="border-top: 1px solid ${COLORS.border}; padding-top: 16px; margin-top: 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 13px; color: ${COLORS.textSecondary};">Total leads: <strong>${data.kpis.totalLeadsAllTime}</strong></td>
                    <td style="font-size: 13px; color: ${COLORS.textSecondary}; text-align: center;">HOT leads: <strong style="color: ${COLORS.hot};">${data.kpis.hotLeadsAllTime}</strong></td>
                    <td style="font-size: 13px; color: ${COLORS.textSecondary}; text-align: right;">Conversion: <strong style="color: ${COLORS.green};">${data.kpis.conversionRate}%</strong></td>
                  </tr>
                </table>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: ${COLORS.bg}; padding: 20px 32px; border-top: 1px solid ${COLORS.border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 12px; color: ${COLORS.textMuted};">
                    Sent by <a href="${BASE_URL}" style="color: ${COLORS.brandPrimary}; text-decoration: none;">PropLeads AI</a>
                  </td>
                  <td style="font-size: 12px; color: ${COLORS.textMuted}; text-align: right;">
                    <a href="${BASE_URL}/settings" style="color: ${COLORS.textMuted}; text-decoration: underline;">Email preferences</a>
                    &nbsp;&middot;&nbsp;
                    <a href="${BASE_URL}/settings?unsubscribe=digest" style="color: ${COLORS.textMuted}; text-decoration: underline;">Unsubscribe</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Main container -->

      </td>
    </tr>
  </table>
  <!-- /Wrapper -->

</body>
</html>`;
}
