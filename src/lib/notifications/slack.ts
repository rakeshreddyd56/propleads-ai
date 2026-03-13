export async function sendSlackNotification(
  webhookUrl: string,
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
  const tierEmoji = lead.tier === "HOT" ? "🔥" : lead.tier === "WARM" ? "☀️" : "❄️";
  const matchLine = lead.matchName
    ? `\n*Best match:* ${lead.matchName} (${lead.matchScore}%)`
    : "";

  const payload = {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `${tierEmoji} *${lead.tier} Lead Found — Score ${lead.score}*`,
            `*${lead.name}* from ${lead.platform} (${lead.source})`,
            `> ${lead.originalText.slice(0, 200)}${lead.originalText.length > 200 ? "..." : ""}`,
            matchLine,
            `<${lead.leadUrl}|View Lead>`,
          ].filter(Boolean).join("\n"),
        },
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (e) {
    console.error("Slack notification failed:", e);
    return false;
  }
}
