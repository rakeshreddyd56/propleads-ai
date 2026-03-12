let accessToken: string | null = null;
let tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const auth = Buffer.from(
    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": process.env.REDDIT_USER_AGENT!,
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;
  return accessToken!;
}

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

export async function searchSubreddit(
  subreddit: string,
  keywords: string[],
  limit = 25
): Promise<RedditPost[]> {
  const token = await getToken();
  const query = keywords.join(" OR ");
  const res = await fetch(
    `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(query)}&restrict_sr=on&sort=new&limit=${limit}&t=week`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": process.env.REDDIT_USER_AGENT!,
      },
    }
  );
  const data = await res.json();
  return (data.data?.children ?? []).map((c: any) => ({
    id: c.data.id,
    title: c.data.title,
    selftext: c.data.selftext,
    author: c.data.author,
    subreddit: c.data.subreddit,
    url: c.data.url,
    permalink: `https://reddit.com${c.data.permalink}`,
    score: c.data.score,
    created_utc: c.data.created_utc,
    num_comments: c.data.num_comments,
  }));
}

export async function getNewPosts(subreddit: string, limit = 50): Promise<RedditPost[]> {
  const token = await getToken();
  const res = await fetch(
    `https://oauth.reddit.com/r/${subreddit}/new?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": process.env.REDDIT_USER_AGENT!,
      },
    }
  );
  const data = await res.json();
  return (data.data?.children ?? []).map((c: any) => ({
    id: c.data.id,
    title: c.data.title,
    selftext: c.data.selftext,
    author: c.data.author,
    subreddit: c.data.subreddit,
    url: c.data.url,
    permalink: `https://reddit.com${c.data.permalink}`,
    score: c.data.score,
    created_utc: c.data.created_utc,
    num_comments: c.data.num_comments,
  }));
}
