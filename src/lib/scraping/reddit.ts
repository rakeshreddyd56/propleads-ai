// Reddit public JSON endpoints — no API keys required
// Rate limit: ~10 requests/min (unauthenticated)

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  url: string;
  permalink: string;
  score: number;
  created_utc: number;
  num_comments: number;
}

const USER_AGENT = "PropLeadsAI/1.0 (Lead Intelligence Platform)";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function searchSubreddit(
  subreddit: string,
  keywords: string[],
  limit = 25
): Promise<RedditPost[]> {
  const query = keywords.join(" OR ");
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&sort=new&limit=${limit}&t=month`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    if (res.status === 429) {
      // Rate limited — wait and retry once
      await delay(3000);
      const retry = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!retry.ok) throw new Error(`Reddit rate limited: ${retry.status}`);
      const data = await retry.json();
      return parseRedditListing(data);
    }
    throw new Error(`Reddit API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return parseRedditListing(data);
}

export async function getNewPosts(subreddit: string, limit = 50): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) throw new Error(`Reddit API error: ${res.status}`);
  const data = await res.json();
  return parseRedditListing(data);
}

function parseRedditListing(data: any): RedditPost[] {
  return (data?.data?.children ?? [])
    .filter((c: any) => c.data.author !== "[deleted]" && c.data.author !== "AutoModerator")
    .map((c: any) => ({
      id: c.data.id,
      title: c.data.title,
      selftext: c.data.selftext ?? "",
      author: c.data.author,
      subreddit: c.data.subreddit,
      url: c.data.url,
      permalink: `https://reddit.com${c.data.permalink}`,
      score: c.data.score,
      created_utc: c.data.created_utc,
      num_comments: c.data.num_comments,
    }));
}
