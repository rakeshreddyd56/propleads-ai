import { searchSubreddit } from "@/lib/scraping/reddit";
import { detectIntentFast, type DetectedIntent } from "@/lib/ai/intent-detector";
import { matchLeadToProperties } from "@/lib/ai/property-matcher";
import { scoreLead } from "@/lib/ai/lead-scorer";
import { db } from "@/lib/db";
import { getPropertyContext, enrichKeywords } from "./property-context";
import { filterNewPosts } from "./dedup";
import { markSourceCompleted, markSourceErrored, completeRunGroup } from "./run-group";
import { isPlatformAllowed, hasFeature, getRequiredTier, canCreateLead, TIER_LEADS_PER_MONTH, type PlanTier } from "./tiers";
import { notifyIfHotLead } from "@/lib/notifications/hot-lead";
import { enrichLead } from "@/lib/enrichment";
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

/**
 * Run a single source — called by /api/scraping/run-source.
 * Each source gets its own full 60s API call.
 * Now tier-aware with dedup, smart merge, auto-score, and notifications.
 */
export async function runSingleSource(
  orgId: string,
  sourceId: string,
  options?: { runGroupId?: string; tier?: PlanTier }
) {
  const source = await db.scrapingSource.findFirst({
    where: { id: sourceId, orgId },
  });
  if (!source) throw new Error("Source not found");

  const tier = options?.tier ?? "FREE";

  // Check tier allows this platform
  if (!isPlatformAllowed(tier, source.platform)) {
    return {
      sourceId: source.id,
      platform: source.platform,
      postsScanned: 0,
      leadsFound: 0,
      leadsUpdated: 0,
      skippedDup: 0,
      error: `${source.platform} requires ${getRequiredTier(source.platform)} plan`,
    };
  }

  // Check monthly lead limit
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const leadsThisMonth = await db.lead.count({
    where: { orgId, createdAt: { gte: monthStart } },
  });
  if (!canCreateLead(tier, leadsThisMonth)) {
    return {
      sourceId: source.id,
      platform: source.platform,
      postsScanned: 0,
      leadsFound: 0,
      leadsUpdated: 0,
      skippedDup: 0,
      error: `Monthly lead limit reached (${TIER_LEADS_PER_MONTH[tier]})`,
    };
  }

  const propertyContext = await getPropertyContext(orgId);
  const enrichedKeywords = enrichKeywords(source.keywords, propertyContext);
  const startTime = Date.now();

  const run = await db.scrapingRun.create({
    data: {
      sourceId: source.id,
      status: "RUNNING",
      runGroupId: options?.runGroupId ?? null,
    },
  });

  try {
    const posts = await fetchPosts(source.platform, source.identifier, enrichedKeywords);

    // Dedup: filter out already-seen posts
    const { newPosts, skippedCount } = await filterNewPosts(orgId, source.platform, posts);
    const limitedPosts = newPosts.slice(0, 8);
    let leadsFound = 0;
    let leadsUpdated = 0;

    for (const post of limitedPosts) {
      if (Date.now() - startTime > 50000) break;

      try {
        const intent = await detectIntentFast(post.text, source.platform);
        if (!intent.isPropertySeeker || intent.confidence < 0.5) continue;

        const result = await upsertLeadSmart(
          source.orgId, source.platform, post, intent, source.displayName
        );
        if (result.created) leadsFound++;
        else leadsUpdated++;

        // Auto-score + notify for Growth+ tiers
        if (hasFeature(tier, "auto_score") && result.lead) {
          await autoScoreAndNotify(orgId, result.lead.id, tier);
        }
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
        leadsUpdated,
        postsSkippedDup: skippedCount,
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      },
    });

    await db.scrapingSource.update({
      where: { id: source.id },
      data: { lastRunAt: new Date(), lastRunLeads: leadsFound },
    });

    if (options?.runGroupId) {
      await markSourceCompleted(options.runGroupId, leadsFound, leadsUpdated);
      await maybeCompleteRunGroup(options.runGroupId);
    }

    return {
      sourceId: source.id,
      platform: source.platform,
      postsScanned: posts.length,
      leadsFound,
      leadsUpdated,
      skippedDup: skippedCount,
    };
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

    if (options?.runGroupId) {
      await markSourceErrored(options.runGroupId);
      await maybeCompleteRunGroup(options.runGroupId);
    }

    return {
      sourceId: source.id,
      platform: source.platform,
      postsScanned: 0,
      leadsFound: 0,
      leadsUpdated: 0,
      skippedDup: 0,
      error: error.message,
    };
  }
}

/**
 * Check if all sources in a run group have finished (completed + errored >= total).
 * If so, finalize the run group status.
 */
async function maybeCompleteRunGroup(runGroupId: string) {
  try {
    const group = await db.runGroup.findUnique({ where: { id: runGroupId } });
    if (!group || group.status !== "RUNNING") return;

    if (group.sourcesCompleted + group.sourcesErrored >= group.sourcesTotal) {
      await completeRunGroup(runGroupId);
    }
  } catch (e) {
    console.error(`Failed to check/complete run group ${runGroupId}:`, e);
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
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    db.property.findMany({ where: { orgId, status: "ACTIVE" } }),
  ]);

  const propertyAreas = [...new Set(properties.map((p) => p.area))];

  const allPriceMins = properties.map((p) => p.priceMin).filter((v): v is bigint => v != null);
  const allPriceMaxs = properties.map((p) => p.priceMax).filter((v): v is bigint => v != null);
  const priceRange = {
    min: allPriceMins.length > 0 ? Number(allPriceMins.reduce((a, b) => a < b ? a : b)) / 100000 : null,
    max: allPriceMaxs.length > 0 ? Number(allPriceMaxs.reduce((a, b) => a > b ? a : b)) / 100000 : null,
  };

  let scored = 0;
  let matched = 0;

  for (const lead of unscoredLeads) {
    if (Date.now() - startTime > 50000) break;

    try {
      const scoreResult = await scoreLead({
        originalText: lead.originalText,
        budget: lead.budget,
        preferredArea: lead.preferredArea,
        timeline: lead.timeline,
        platform: lead.platform,
        buyerPersona: lead.buyerPersona,
      }, propertyAreas, priceRange);

      await db.lead.update({
        where: { id: lead.id },
        data: {
          score: scoreResult.total,
          scoreBreakdown: scoreResult.breakdown as any,
          tier: scoreResult.tier,
        },
      });
      scored++;

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

// ---- Smart Lead Upsert ----

async function upsertLeadSmart(
  orgId: string,
  platform: string,
  post: ScrapedPost,
  intent: DetectedIntent,
  sourceName: string
) {
  const platformUserId = post.authorId || post.author;

  const existing = await db.lead.findUnique({
    where: { orgId_platform_platformUserId: { orgId, platform: platform as any, platformUserId } },
  });

  if (existing) {
    // Smart merge: keep best data from both
    const mergedAreas = [...new Set([...(existing.preferredArea ?? []), ...(intent.preferredAreas ?? [])])];
    const keepLongerText = (post.text?.length ?? 0) > (existing.originalText?.length ?? 0)
      ? post.text.slice(0, 5000) : undefined;
    const widerBudgetMin = intent.budget.min && existing.budgetMin
      ? BigInt(Math.min(Number(existing.budgetMin), intent.budget.min))
      : intent.budget.min ? BigInt(intent.budget.min) : undefined;
    const widerBudgetMax = intent.budget.max && existing.budgetMax
      ? BigInt(Math.max(Number(existing.budgetMax), intent.budget.max))
      : intent.budget.max ? BigInt(intent.budget.max) : undefined;

    const lead = await db.lead.update({
      where: { id: existing.id },
      data: {
        ...(keepLongerText && { originalText: keepLongerText }),
        sourceUrl: post.url,
        preferredArea: mergedAreas,
        ...(widerBudgetMin && { budgetMin: widerBudgetMin }),
        ...(widerBudgetMax && { budgetMax: widerBudgetMax }),
        budget: intent.budget.raw || existing.budget,
        propertyType: intent.propertyType || existing.propertyType,
        timeline: intent.timeline || existing.timeline,
        buyerPersona: intent.persona || existing.buyerPersona,
        intentSignals: intent.intentSignals as any,
        lastSeenAt: new Date(),
        source: sourceName,
      },
    });
    return { lead, created: false };
  }

  const lead = await db.lead.create({
    data: {
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
      lastSeenAt: new Date(),
      source: sourceName,
    },
  });
  return { lead, created: true };
}

// ---- Auto-score + Notify ----

async function autoScoreAndNotify(orgId: string, leadId: string, tier: PlanTier) {
  try {
    const [lead, properties] = await Promise.all([
      db.lead.findUnique({ where: { id: leadId } }),
      db.property.findMany({ where: { orgId, status: "ACTIVE" } }),
    ]);
    if (!lead) return;

    const propertyAreas = [...new Set(properties.map((p) => p.area))];

    const priceMins = properties.map((p) => p.priceMin).filter((v): v is bigint => v != null);
    const priceMaxs = properties.map((p) => p.priceMax).filter((v): v is bigint => v != null);
    const priceRange = {
      min: priceMins.length > 0 ? Number(priceMins.reduce((a, b) => a < b ? a : b)) / 100000 : null,
      max: priceMaxs.length > 0 ? Number(priceMaxs.reduce((a, b) => a > b ? a : b)) / 100000 : null,
    };

    const scoreResult = await scoreLead({
      originalText: lead.originalText,
      budget: lead.budget,
      preferredArea: lead.preferredArea,
      timeline: lead.timeline,
      platform: lead.platform,
      buyerPersona: lead.buyerPersona,
    }, propertyAreas, priceRange);

    await db.lead.update({
      where: { id: lead.id },
      data: {
        score: scoreResult.total,
        scoreBreakdown: scoreResult.breakdown as any,
        tier: scoreResult.tier,
      },
    });

    if (properties.length > 0) {
      const matches = await matchLeadToProperties(lead, properties);
      for (const match of matches) {
        await db.leadPropertyMatch.upsert({
          where: { leadId_propertyId: { leadId: lead.id, propertyId: match.propertyId } },
          update: { matchScore: match.score, matchReasons: match.reasons, aiSummary: match.aiSummary },
          create: {
            leadId: lead.id, propertyId: match.propertyId,
            matchScore: match.score, matchReasons: match.reasons, aiSummary: match.aiSummary,
          },
        });
      }
    }

    await notifyIfHotLead(orgId, {
      id: lead.id, name: lead.name, platform: lead.platform,
      source: lead.source, originalText: lead.originalText,
      score: scoreResult.total, tier: scoreResult.tier,
    });

    // Pro tier: auto-enrich HOT leads with contact info
    if (scoreResult.tier === "HOT" && hasFeature(tier, "contact_enrichment")) {
      enrichLead(lead.id).catch((e) =>
        console.warn(`Auto-enrichment failed for lead ${lead.id}:`, e)
      );
    }
  } catch (e) {
    console.error(`Auto-score error for lead ${leadId}:`, e);
  }
}

// ---- Platform Fetchers ----

async function fetchPosts(
  platform: string,
  identifier: string,
  keywords: string[]
): Promise<ScrapedPost[]> {
  if (!process.env.FIRECRAWL_API_KEY && platform !== "REDDIT") {
    throw new Error(`${platform} requires FIRECRAWL_API_KEY for web search`);
  }

  switch (platform) {
    case "REDDIT": {
      const posts = await searchSubreddit(identifier, keywords, 10);
      return posts.map((p) => ({
        text: `${p.title}\n\n${p.selftext}`,
        author: p.author, authorId: p.author, url: p.permalink,
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
      // Deduplicate: if keywords[0] is already part of the identifier, skip it
      // to avoid queries like "hyderabad property review hyderabad"
      const firstKeyword = keywords[0]?.toLowerCase() ?? "";
      const query = (keywords.length > 0 && !identifier.toLowerCase().includes(firstKeyword))
        ? `${identifier} ${keywords[0]}`
        : identifier;
      const comments = await scrapeYouTubeComments(query, 15);
      return comments.map((c) => ({ text: c.text, author: c.author, authorId: c.authorId, url: c.videoUrl }));
    }
    case "LINKEDIN": {
      const posts = await scrapeLinkedIn(identifier, keywords, 10);
      return posts.map((p) => ({ text: p.text, author: p.author, authorId: p.authorId, url: p.url, profileUrl: p.profileUrl }));
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
