export async function sendEmailNotification(
  to: string,
  lead: {
    name: string;
    platform: string;
    source: string;
    originalText: string;
    score: number;
    tier: string;
    matchName?: string;
    matchScore?: number;
    leadUrl: string;
  }
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("Resend not configured, skipping email notification");
    return false;
  }

  const matchLine = lead.matchName
    ? `<p><strong>Best match:</strong> ${lead.matchName} (${lead.matchScore}%)</p>`
    : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 500px;">
      <h2 style="color: ${lead.tier === "HOT" ? "#dc2626" : "#f59e0b"}">
        ${lead.tier} Lead — Score ${lead.score}
      </h2>
      <p><strong>${lead.name}</strong> from ${lead.platform} (${lead.source})</p>
      <blockquote style="border-left: 3px solid #e5e7eb; padding-left: 12px; color: #6b7280;">
        ${lead.originalText.slice(0, 300)}
      </blockquote>
      ${matchLine}
      <p><a href="${lead.leadUrl}" style="color: #2563eb;">View Lead</a></p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "PropLeads <leads@propleads-ai.vercel.app>",
        to,
        subject: `${lead.tier} Lead: ${lead.name} looking for property`,
        html,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("Email notification failed:", e);
    return false;
  }
}
