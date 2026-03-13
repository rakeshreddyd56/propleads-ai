import { searchSubreddit } from "@/lib/scraping/reddit";
import { detectIntentFast, type DetectedIntent } from "@/lib/ai/intent-detector";
import { matchLeadToProperties } from "@/lib/ai/property-matcher";
import { scoreLead } from "@/lib/ai/lead-scorer";
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

const APIFY_PLATFORMS = [
  "FACEBOOK", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER",
  "GOOGLE_MAPS", "INSTAGRAM", "TWITTER", "YOUTUBE", "LINKEDIN", "QUORA", "TELEGRAM",
];

// Max posts to process per source (keeps total AI calls low)
const MAX_POSTS_PER_SOURCE = 5;
// Global timeout — stop well before Vercel's 60s limit
const GLOBAL_TIMEOUT_MS = 40000;
// Per-source timeout
const SOURCE_TIMEOUT_MS = 15000;

/**
 * Main scraping entry point.
 * Phase 1: Scrape + intent detection + save leads (fits in 60s timeout)
 * Scoring/matching happens separately via scoreAllLeads()
 */
export async function runScraping(orgId: string) {
  const sources = await db.scrapingSource.findMany({
    where: { orgId, isActive: true },
  });

  const propertyContext = await getPropertyContext(orgId);
  const results: SourceResult[] = [];
  const startGlobal = Date.now();

  // Separate Apify sources from free sources — process free ones first
  const freeSources = sources.filter((s) => !APIFY_PLATFORMS.includes(s.platform));
  const apifySources = sources.filter((s) => APIFY_PLATFORMS.includes(s.platform));

  // Quick-skip all Apify sources if no token (don't waste time on DB operations)
  if (!process.env.APIFY_API_TOKEN) {
    for (const source of apifySources) {
      results.push({
        sourceId: source.id,
        platform: source.platform,
        postsScanned: 0,
        leadsFound: 0,
        error: "APIFY_API_TOKEN not configured",
      });
    }
  }

  // Process free sources (Reddit, CommonFloor) first
  const sourcesToProcess = process.env.APIFY_API_TOKEN
    ? [...freeSources, ...apifySources]
    : freeSources;

  for (const source of sourcesToProcess) {
    // Stop if approaching global timeout
    if (Date.now() - startGlobal > GLOBAL_TIMEOUT_MS) {
      results.push({
        sourceId: source.id,
        platform: source.platform,
        postsScanned: 0,
        leadsFound: 0,
        error: "Skipped: timeout approaching",
      });
      continue;
    }

    const sourceStart = Date.now();
    let leadsFound = 0;
    let postsScanned = 0;

    const run = await db.scrapingRun.create({
      data: { sourceId: source.id, status: "RUNNING" },
    });

    try {
      const enrichedKeywords = enrichKeywords(source.keywords, propertyContext);

      // Wrap fetchPosts in a per-source timeout
      const posts = await Promise.race([
        fetchPosts(source.platform, source.identifier, enrichedKeywords),
        delay(SOURCE_TIMEOUT_MS).then(() => [] as ScrapedPost[]),
      ]);

      // Limit posts to keep AI calls manageable
      const limitedPosts = posts.slice(0, MAX_POSTS_PER_SOURCE);
      postsScanned = posts.length;

      for (const post of limitedPosts) {
        // Check both global and per-source timeout
        if (Date.now() - startGlobal > GLOBAL_TIMEOUT_MS) break;
        if (Date.now() - sourceStart > SOURCE_TIMEOUT_MS) break;

        try {
          const intent = await detectIntentFast(post.text, source.platform);
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
          durationMs: Date.now() - sourceStart,
        },
      });

      await db.scrapingSource.update({
        where: { id: source.id },
        data: { lastRunAt: new Date(), lastRunLeads: leadsFound },
      });

      results.push({ sourceId: source.id, platform: source.platform, postsScanned, leadsFound });

      // Brief rate limit between Reddit sources only
      if (source.platform === "REDDIT") await delay(1000);
    } catch (error: any) {
      await db.scrapingRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          errors: { message: error.message },
          completedAt: new Date(),
          durationMs: Date.now() - sourceStart,
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
 * Run a single source — called by /api/scraping/run-source.
 * Each source gets its own full 60s API call.
 */
export async function runSingleSource(orgId: string, sourceId: string) {
  const source = await db.scrapingSource.findFirst({
    where: { id: sourceId, orgId },
  });
  if (!source) throw new Error("Source not found");

  // Quick-fail for Apify sources without token
  if (APIFY_PLATFORMS.includes(source.platform) && !process.env.APIFY_API_TOKEN) {
    return {
      sourceId: source.id,
      platform: source.platform,
      postsScanned: 0,
      leadsFound: 0,
      error: "APIFY_API_TOKEN not configured. Get one free at apify.com",
    };
  }

  const propertyContext = await getPropertyContext(orgId);
  const enrichedKeywords = enrichKeywords(source.keywords, propertyContext);
  const startTime = Date.now();

  const run = await db.scrapingRun.create({
    data: { sourceId: source.id, status: "RUNNING" },
  });

  try {
    const posts = await fetchPosts(source.platform, source.identifier, enrichedKeywords);
    const limitedPosts = posts.slice(0, 8); // More posts per source since each gets full 60s
    let leadsFound = 0;

    for (const post of limitedPosts) {
      if (Date.now() - startTime > 50000) break; // 50s guard

      try {
        const intent = await detectIntentFast(post.text, source.platform);
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
        postsScanned: posts.length,
        leadsFound,
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      },
    });

    await db.scrapingSource.update({
      where: { id: source.id },
      data: { lastRunAt: new Date(), lastRunLeads: leadsFound },
    });

    return { sourceId: source.id, platform: source.platform, postsScanned: posts.length, leadsFound };
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

    return { sourceId: source.id, platform: source.platform, postsScanned: 0, leadsFound: 0, error: error.message };
  }
}

/**
 * Score and match all unscored leads for an org.
 * Called separately from scraping to stay within timeout.
 */
export async function scoreAllLeads(orgId: string) {
  const startTime = Date.now();

  const [unscoredLeads, properties] = await Promise.all([
    db.lead.findMany({
      where: { orgId, score: 0 },
      take: 5, // Only 5 at a time — each needs 2 AI calls
      orderBy: { createdAt: "desc" },
    }),
    db.property.findMany({ where: { orgId, status: "ACTIVE" } }),
  ]);

  const propertyAreas = [...new Set(properties.map((p) => p.area))];
  let scored = 0;
  let matched = 0;

  for (const lead of unscoredLeads) {
    // Stay within 50s
    if (Date.now() - startTime > 50000) break;

    try {
      // Score
      const scoreResult = await scoreLead({
        originalText: lead.originalText,
        budget: lead.budget,
        preferredArea: lead.preferredArea,
        timeline: lead.timeline,
        platform: lead.platform,
        buyerPersona: lead.buyerPersona,
      }, propertyAreas);

      await db.lead.update({
        where: { id: lead.id },
        data: {
          score: scoreResult.total,
          scoreBreakdown: scoreResult.breakdown as any,
          tier: scoreResult.tier,
        },
      });
      scored++;

      // Match
      if (properties.length > 0) {
        const matches = await matchLeadToProperties(lead, properties);
        for (const match of matches) {
          await db.leadPropertyMatch.upsert({
            where: { leadId_propertyId: { leadId: lead.id, propertyId: match.propertyId } },
            update: { matchScore: match.score, matchReasons: match.reasons, aiSummary: match.aiSummary },
            create: {
              leadId: lead.id,
              propertyId: match.propertyId,
              matchScore: match.score,
              matchReasons: match.reasons,
              aiSummary: match.aiSummary,
            },
          });
        }
        matched++;
      }
    } catch (e) {
      console.error(`Score/match error for lead ${lead.id}:`, e);
    }
  }

  const totalUnscored = await db.lead.count({ where: { orgId, score: 0 } });
  return { scored, matched, remaining: totalUnscored };
}

// ---- Platform Fetchers ----

async function fetchPosts(
  platform: string,
  identifier: string,
  keywords: string[]
): Promise<ScrapedPost[]> {
  if (APIFY_PLATFORMS.includes(platform) && !process.env.APIFY_API_TOKEN) {
    throw new Error(`${platform} requires APIFY_API_TOKEN. Get one free at apify.com`);
  }

  switch (platform) {
    case "REDDIT": {
      const posts = await searchSubreddit(identifier, keywords, 10);
      return posts.map((p) => ({
        text: `${p.title}\n\n${p.selftext}`,
        author: p.author,
        authorId: p.author,
        url: p.permalink,
        profileUrl: `https://reddit.com/u/${p.author}`,
      }));
    }

    case "FACEBOOK": {
      const posts = await scrapeFacebookGroup(identifier, keywords, 10);
      return posts.map((p) => ({ text: p.text, author: p.author, authorId: p.authorId, url: p.url }));
    }

    case "NINETY_NINE_ACRES": {
      const listings = await scrape99Acres(identifier, keywords, 10);
      return listings.map((l) => ({
        text: `${l.title}\n${l.description}\nPrice: ${l.price}\nLocation: ${l.location}\nType: ${l.propertyType}`,
        author: l.sellerName, authorId: l.sellerName.replace(/\s+/g, "_").toLowerCase(), url: l.url,
      }));
    }

    case "MAGICBRICKS": {
      const listings = await scrapeMagicBricks(identifier, keywords, 10);
      return listings.map((l) => ({
        text: `${l.title}\n${l.description}\nPrice: ${l.price}\nLocation: ${l.location}\nType: ${l.propertyType}`,
        author: l.sellerName, authorId: l.sellerName.replace(/\s+/g, "_").toLowerCase(), url: l.url,
      }));
    }

    case "NOBROKER": {
      const listings = await scrapeNoBroker(identifier, keywords, 10);
      return listings.map((l) => ({
        text: `${l.title}\n${l.description}\nPrice: ${l.price}\nLocation: ${l.location}\nType: ${l.propertyType}`,
        author: l.sellerName, authorId: l.sellerName.replace(/\s+/g, "_").toLowerCase(), url: l.url,
      }));
    }

    case "GOOGLE_MAPS": {
      const places = await scrapeGoogleMaps(identifier, "Hyderabad", 10);
      const posts: ScrapedPost[] = [];
      for (const place of places) {
        for (const review of place.reviews) {
          if (review.text.length > 20) {
            posts.push({
              text: `Review for ${place.name}: ${review.text}`,
              author: review.author, authorId: review.author.replace(/\s+/g, "_").toLowerCase(), url: place.url,
            });
          }
        }
      }
      return posts;
    }

    case "INSTAGRAM": {
      const posts = await scrapeInstagram(identifier, keywords, 10);
      const results: ScrapedPost[] = [];
      for (const p of posts) {
        results.push({ text: p.text, author: p.author, authorId: p.authorId, url: p.url, profileUrl: `https://instagram.com/${p.author}` });
        for (const c of p.comments) {
          if (c.text.length > 15) results.push({ text: c.text, author: c.author, authorId: c.author, url: p.url, profileUrl: `https://instagram.com/${c.author}` });
        }
      }
      return results;
    }

    case "TWITTER": {
      const tweets = await scrapeTwitter(identifier, keywords, 10);
      return tweets.map((t) => ({ text: t.text, author: t.author, authorId: t.authorId, url: t.url, profileUrl: `https://x.com/${t.author}` }));
    }

    case "YOUTUBE": {
      const comments = await scrapeYouTubeComments(keywords.length > 0 ? `${identifier} ${keywords[0]}` : identifier, 15);
      return comments.map((c) => ({ text: c.text, author: c.author, authorId: c.authorId, url: c.videoUrl }));
    }

    case "LINKEDIN": {
      const posts = await scrapeLinkedIn(identifier, keywords, 10);
      return posts.map((p) => ({ text: p.text, author: p.author, authorId: p.authorId, url: p.url, profileUrl: p.authorId }));
    }

    case "QUORA": {
      const questions = await scrapeQuora(identifier, keywords, 10);
      return questions.map((q) => ({ text: `${q.question}\n\n${q.details}`, author: q.author, authorId: q.authorId, url: q.url }));
    }

    case "TELEGRAM": {
      const messages = await scrapeTelegram(identifier, keywords, 15);
      return messages.map((m) => ({ text: m.text, author: m.author, authorId: String(m.authorId), url: m.url }));
    }

    case "COMMONFLOOR": {
      const posts = await scrapeCommonFloor(identifier, keywords, 10);
      return posts.map((p) => ({ text: p.text, author: p.author, authorId: p.author.replace(/\s+/g, "_").toLowerCase(), url: p.url }));
    }

    default:
      return [];
  }
}

async function upsertLead(orgId: string, platform: string, post: ScrapedPost, intent: DetectedIntent) {
  const platformUserId = post.authorId || post.author;
  return db.lead.upsert({
    where: { orgId_platform_platformUserId: { orgId, platform: platform as any, platformUserId } },
    update: {
      originalText: post.text.slice(0, 5000), sourceUrl: post.url,
      budget: intent.budget.raw,
      budgetMin: intent.budget.min ? BigInt(intent.budget.min) : null,
      budgetMax: intent.budget.max ? BigInt(intent.budget.max) : null,
      preferredArea: intent.preferredAreas, propertyType: intent.propertyType,
      timeline: intent.timeline, buyerPersona: intent.persona,
      intentSignals: intent.intentSignals as any,
    },
    create: {
      orgId, platform: platform as any, platformUserId,
      name: intent.extractedName ?? post.author,
      profileUrl: post.profileUrl ?? null, sourceUrl: post.url,
      originalText: post.text.slice(0, 5000),
      budget: intent.budget.raw,
      budgetMin: intent.budget.min ? BigInt(intent.budget.min) : null,
      budgetMax: intent.budget.max ? BigInt(intent.budget.max) : null,
      preferredArea: intent.preferredAreas, propertyType: intent.propertyType,
      timeline: intent.timeline, buyerPersona: intent.persona,
      intentSignals: intent.intentSignals as any,
    },
  });
}
