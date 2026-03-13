import { searchWeb } from "../firecrawl";
import {
  runApifyActor, APIFY_ACTORS, formatTelegramInput,
  isApifyConfigured,
} from "../apify";

export interface TelegramMessage {
  id: string;
  text: string;
  author: string;
  authorId: string;
  channelName: string;
  url: string;
  timestamp: string;
  views: number;
}

/**
 * Scrape Telegram channel/group messages.
 * Primary: Apify actor (real messages with sender info + views).
 * Fallback: Firecrawl web search on t.me.
 */
export async function scrapeTelegram(
  channelId: string,
  keywords: string[],
  limit = 15
): Promise<TelegramMessage[]> {
  if (isApifyConfigured()) {
    try {
      const input = formatTelegramInput(channelId, limit);
      const items = await runApifyActor(APIFY_ACTORS.TELEGRAM, input, { maxItems: limit });
      if (items.length > 0) return items.map((i) => mapApifyMessage(i, channelId)).filter(Boolean) as TelegramMessage[];
    } catch (e) {
      console.warn("Telegram Apify failed:", e);
    }
  }

  return scrapeViaFirecrawl(channelId, keywords, limit);
}

function mapApifyMessage(item: any, channelId: string): TelegramMessage | null {
  const text = item.text || item.message || item.content || "";
  if (!text || text.length < 10) return null;

  const author = item.senderName || item.from || item.author || item.forwardFrom || "Telegram User";
  const authorId = item.senderId || item.fromId || item.authorId || String(author);
  const messageId = item.messageId || item.id || "";
  const channel = item.channelName || item.chatTitle || channelId;

  return {
    id: messageId ? String(messageId) : `tg-${Buffer.from(text.slice(0, 50)).toString("base64").slice(0, 12)}`,
    text: text.slice(0, 3000),
    author,
    authorId: String(authorId),
    channelName: channel,
    url: item.url || item.messageUrl || `https://t.me/${channelId.replace(/^@/, "")}/${messageId}`,
    timestamp: item.date || item.timestamp || new Date().toISOString(),
    views: item.views || item.viewCount || 0,
  };
}

async function scrapeViaFirecrawl(channelId: string, keywords: string[], limit: number): Promise<TelegramMessage[]> {
  const keywordStr = keywords.slice(0, 3).join(" ");
  const query = `site:t.me ${channelId} ${keywordStr} hyderabad property flat`.trim();
  const results = await searchWeb(query, limit);

  return results
    .filter((r) => r.url?.includes("t.me"))
    .map((r) => ({
      id: `tg-${Buffer.from(r.url).toString("base64").slice(0, 12)}`,
      text: r.markdown?.slice(0, 2000) ?? r.title ?? "",
      author: "Telegram User",
      authorId: `tg-${Buffer.from(r.url).toString("base64").slice(0, 8)}`,
      channelName: channelId,
      url: r.url,
      timestamp: new Date().toISOString(),
      views: 0,
    }));
}
