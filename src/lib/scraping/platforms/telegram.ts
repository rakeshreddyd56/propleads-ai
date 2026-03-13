import { searchWeb } from "../firecrawl";

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

export async function scrapeTelegram(
  channelId: string,
  keywords: string[],
  limit = 10
): Promise<TelegramMessage[]> {
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
