import { searchSubreddit } from "@/lib/scraping/reddit";
import { detectIntent, type DetectedIntent } from "@/lib/ai/intent-detector";
import { db } from "@/lib/db";
import { getPropertyContext, enrichKeywords } from "./property-context";
import {
  scrapeFacebookGroup,
  scrape99Acres,
  scrapeMagicBricks,
  scrapeNoBroker,
  scrapeGoogleMaps,
  scrapeInstagram,
  scrapeTwitter,
  scrapeYouTubeComments,
  scrapeLinkedIn,
  scrapeQuora,
  scrapeTelegram,
  scrapeCommonFloor,
} from "./platforms";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ScrapedPost {
  text: string;
  author: string;
  authorId: string;
  url: string;
  profileUrl?: string;
}

type SourceResult = {
  sourceId: string;
  platform: string;
  postsScanned: number;
  leadsFound: number;
  error?: string;
};

export async function runScraping(orgId: string) {
  const sources = await db.scrapingSource.findMany({
    where: { orgId, isActive: true },
  });

  // Get property context to enrich scraping with our inventory data
  const propertyContext = await getPropertyContext(orgId);

  const results: SourceResult[] = [];

  for (const source of sources) {
    const startTime = Date.now();
    let leadsFound = 0;
    let postsScanned = 0;

    const run = await db.scrapingRun.create({
      data: { sourceId: source.id, status: "RUNNING" },
    });

    try {
      const enrichedKeywords = enrichKeywords(source.keywords, propertyContext);
      const posts = await fetchPosts(source.platform, source.identifier, enrichedKeywords);
      postsScanned = posts.length;

      for (const post of posts) {
        try {
          const intent = await detectIntent(post.text, source.platform);
          if (!intent.isPropertySeeker || intent.confidence < 0.5) continue;

          await upsertLead(source.orgId, source.platform, post, intent);
          leadsFound++;
        } catch (e) {
          console.error(`Error processing post from ${source.platform}:`, e);
        }
      }

      await db.scrapingRun.update({
        where: { id: run.id },
        data: {
          status: "COMPLETED",
          postsScanned,
          leadsFound,
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
        },
      });

      await db.scrapingSource.update({
        where: { id: source.id },
        data: { lastRunAt: new Date(), lastRunLeads: leadsFound },
      });

      results.push({ sourceId: source.id, platform: source.platform, postsScanned, leadsFound });

      // Rate limit between sources (6s for Reddit, 3s for others)
      await delay(source.platform === "REDDIT" ? 6000 : 3000);
    } catch (error: any) {
      await db.scrapingRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          errors: { message: error.message },
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
        },
      });

      results.push({
        sourceId: source.id,
        platform: source.platform,
        postsScanned: 0,
        leadsFound: 0,
        error: error.message,
      });
    }
  }

  return {
    sourcesProcessed: sources.length,
    totalLeads: results.reduce((sum, r) => sum + r.leadsFound, 0),
    results,
  };
}

/**
 * Fetches posts from any platform and normalizes them to a common format.
 */
async function fetchPosts(
  platform: string,
  identifier: string,
  keywords: string[]
): Promise<ScrapedPost[]> {
  switch (platform) {
    case "REDDIT": {
      const posts = await searchSubreddit(identifier, keywords, 15);
      return posts.map((p) => ({
        text: `${p.title}\n\n${p.selftext}`,
        author: p.author,
        authorId: p.author,
        url: p.permalink,
        profileUrl: `https://reddit.com/u/${p.author}`,
      }));
    }

    case "FACEBOOK": {
      const posts = await scrapeFacebookGroup(identifier, keywords, 15);
      return posts.map((p) => ({
        text: p.text,
        author: p.author,
        authorId: p.authorId,
        url: p.url,
      }));
    }

    case "NINETY_NINE_ACRES": {
      const listings = await scrape99Acres(identifier, keywords, 20);
      // For portal listings, the "text" is the listing itself.
      // Intent detection checks if the poster is a buyer (requirement post) vs seller.
      return listings.map((l) => ({
        text: `${l.title}\n${l.description}\nPrice: ${l.price}\nLocation: ${l.location}\nType: ${l.propertyType}`,
        author: l.sellerName,
        authorId: l.sellerName.replace(/\s+/g, "_").toLowerCase(),
        url: l.url,
      }));
    }

    case "MAGICBRICKS": {
      const listings = await scrapeMagicBricks(identifier, keywords, 20);
      return listings.map((l) => ({
        text: `${l.title}\n${l.description}\nPrice: ${l.price}\nLocation: ${l.location}\nType: ${l.propertyType}`,
        author: l.sellerName,
        authorId: l.sellerName.replace(/\s+/g, "_").toLowerCase(),
        url: l.url,
      }));
    }

    case "NOBROKER": {
      const listings = await scrapeNoBroker(identifier, keywords, 20);
      return listings.map((l) => ({
        text: `${l.title}\n${l.description}\nPrice: ${l.price}\nLocation: ${l.location}\nType: ${l.propertyType}`,
        author: l.sellerName,
        authorId: l.sellerName.replace(/\s+/g, "_").toLowerCase(),
        url: l.url,
      }));
    }

    case "GOOGLE_MAPS": {
      const places = await scrapeGoogleMaps(identifier, "Hyderabad", 15);
      // Extract reviews as posts — reviews contain buyer signals
      const posts: ScrapedPost[] = [];
      for (const place of places) {
        for (const review of place.reviews) {
          if (review.text.length > 20) {
            posts.push({
              text: `Review for ${place.name}: ${review.text}`,
              author: review.author,
              authorId: review.author.replace(/\s+/g, "_").toLowerCase(),
              url: place.url,
            });
          }
        }
      }
      return posts;
    }

    case "INSTAGRAM": {
      const posts = await scrapeInstagram(identifier, keywords, 15);
      const results: ScrapedPost[] = [];
      for (const p of posts) {
        // Main post
        results.push({
          text: p.text,
          author: p.author,
          authorId: p.authorId,
          url: p.url,
          profileUrl: `https://instagram.com/${p.author}`,
        });
        // Comments as separate leads
        for (const c of p.comments) {
          if (c.text.length > 15) {
            results.push({
              text: c.text,
              author: c.author,
              authorId: c.author,
              url: p.url,
              profileUrl: `https://instagram.com/${c.author}`,
            });
          }
        }
      }
      return results;
    }

    case "TWITTER": {
      const tweets = await scrapeTwitter(identifier, keywords, 20);
      return tweets.map((t) => ({
        text: t.text,
        author: t.author,
        authorId: t.authorId,
        url: t.url,
        profileUrl: `https://x.com/${t.author}`,
      }));
    }

    case "YOUTUBE": {
      const comments = await scrapeYouTubeComments(
        keywords.length > 0 ? `${identifier} ${keywords[0]}` : identifier,
        30
      );
      return comments.map((c) => ({
        text: c.text,
        author: c.author,
        authorId: c.authorId,
        url: c.videoUrl,
      }));
    }

    case "LINKEDIN": {
      const posts = await scrapeLinkedIn(identifier, keywords, 15);
      return posts.map((p) => ({
        text: p.text,
        author: p.author,
        authorId: p.authorId,
        url: p.url,
        profileUrl: p.authorId,
      }));
    }

    case "QUORA": {
      const questions = await scrapeQuora(identifier, keywords, 15);
      return questions.map((q) => ({
        text: `${q.question}\n\n${q.details}`,
        author: q.author,
        authorId: q.authorId,
        url: q.url,
      }));
    }

    case "TELEGRAM": {
      const messages = await scrapeTelegram(identifier, keywords, 25);
      return messages.map((m) => ({
        text: m.text,
        author: m.author,
        authorId: String(m.authorId),
        url: m.url,
      }));
    }

    case "COMMONFLOOR": {
      const posts = await scrapeCommonFloor(identifier, keywords, 15);
      return posts.map((p) => ({
        text: p.text,
        author: p.author,
        authorId: p.author.replace(/\s+/g, "_").toLowerCase(),
        url: p.url,
      }));
    }

    default:
      console.warn(`Unsupported platform: ${platform}`);
      return [];
  }
}

/**
 * Upserts a lead into the database with AI-detected intent data.
 */
async function upsertLead(
  orgId: string,
  platform: string,
  post: ScrapedPost,
  intent: DetectedIntent
) {
  const platformUserId = post.authorId || post.author;

  await db.lead.upsert({
    where: {
      orgId_platform_platformUserId: {
        orgId,
        platform: platform as any,
        platformUserId,
      },
    },
    update: {
      originalText: post.text.slice(0, 5000),
      sourceUrl: post.url,
      budget: intent.budget.raw,
      budgetMin: intent.budget.min ? BigInt(intent.budget.min) : null,
      budgetMax: intent.budget.max ? BigInt(intent.budget.max) : null,
      preferredArea: intent.preferredAreas,
      propertyType: intent.propertyType,
      timeline: intent.timeline,
      buyerPersona: intent.persona,
      intentSignals: intent.intentSignals as any,
    },
    create: {
      orgId,
      platform: platform as any,
      platformUserId,
      name: intent.extractedName ?? post.author,
      profileUrl: post.profileUrl ?? null,
      sourceUrl: post.url,
      originalText: post.text.slice(0, 5000),
      budget: intent.budget.raw,
      budgetMin: intent.budget.min ? BigInt(intent.budget.min) : null,
      budgetMax: intent.budget.max ? BigInt(intent.budget.max) : null,
      preferredArea: intent.preferredAreas,
      propertyType: intent.propertyType,
      timeline: intent.timeline,
      buyerPersona: intent.persona,
      intentSignals: intent.intentSignals as any,
    },
  });
}
