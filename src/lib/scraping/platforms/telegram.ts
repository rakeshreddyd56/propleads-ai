import { runApifyActor, APIFY_ACTORS } from "../apify";

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
 * Scrapes Telegram public channels/groups for real estate discussions.
 * Many Indian RE groups operate on Telegram with buyer requirements, price discussions.
 */
export async function scrapeTelegram(
  channelId: string,
  keywords: string[],
  limit = 30
): Promise<TelegramMessage[]> {
  const items = await runApifyActor(APIFY_ACTORS.TELEGRAM, {
    channelUrls: [`https://t.me/${channelId}`],
    maxMessages: limit,
  });

  // Filter by keywords if provided
  const keywordLower = keywords.map((k) => k.toLowerCase());

  return items
    .filter((item: any) => {
      const text = (item.text ?? item.message ?? "").toLowerCase();
      if (keywordLower.length === 0) return true;
      return keywordLower.some((k) => text.includes(k));
    })
    .map((item: any) => ({
      id: item.messageId ?? item.id ?? String(Math.random()),
      text: item.text ?? item.message ?? "",
      author: item.senderName ?? item.fromName ?? item.sender?.firstName ?? "Unknown",
      authorId: item.senderId ?? item.fromId ?? "unknown",
      channelName: item.channelName ?? item.chatTitle ?? channelId,
      url: `https://t.me/${channelId}/${item.messageId ?? ""}`,
      timestamp: item.date ?? item.timestamp ?? new Date().toISOString(),
      views: item.views ?? item.viewCount ?? 0,
    }));
}
