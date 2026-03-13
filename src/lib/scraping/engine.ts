import { searchSubreddit } from "@/lib/scraping/reddit";
import { detectIntent } from "@/lib/ai/intent-detector";
import { db } from "@/lib/db";

export async function runScraping(orgId: string) {
  const sources = await db.scrapingSource.findMany({
    where: { orgId, isActive: true },
  });

  const results: { sourceId: string; platform: string; postsScanned: number; leadsFound: number; error?: string }[] = [];

  for (const source of sources) {
    const startTime = Date.now();
    let leadsFound = 0;
    let postsScanned = 0;

    const run = await db.scrapingRun.create({
      data: { sourceId: source.id, status: "RUNNING" },
    });

    try {
      if (source.platform === "REDDIT") {
        if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
          throw new Error("Reddit API keys not configured");
        }

        const posts = await searchSubreddit(source.identifier, source.keywords, 25);
        postsScanned = posts.length;

        for (const post of posts) {
          try {
            const text = `${post.title}\n\n${post.selftext}`;
            const intent = await detectIntent(text, "REDDIT");

            if (!intent.isPropertySeeker || intent.confidence < 0.5) continue;

            await db.lead.upsert({
              where: {
                orgId_platform_platformUserId: {
                  orgId: source.orgId,
                  platform: "REDDIT",
                  platformUserId: post.author,
                },
              },
              update: {
                originalText: text,
                sourceUrl: post.permalink,
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
                orgId: source.orgId,
                platform: "REDDIT",
                platformUserId: post.author,
                name: intent.extractedName ?? post.author,
                profileUrl: `https://reddit.com/u/${post.author}`,
                sourceUrl: post.permalink,
                originalText: text,
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

            leadsFound++;
          } catch (e) {
            // Skip individual post errors, continue with rest
            console.error(`Error processing post ${post.id}:`, e);
          }
        }
      }
      // Future: add FACEBOOK, NINETY_NINE_ACRES, etc. handlers here

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

      results.push({ sourceId: source.id, platform: source.platform, postsScanned: 0, leadsFound: 0, error: error.message });
    }
  }

  return {
    sourcesProcessed: sources.length,
    totalLeads: results.reduce((sum, r) => sum + r.leadsFound, 0),
    results,
  };
}
