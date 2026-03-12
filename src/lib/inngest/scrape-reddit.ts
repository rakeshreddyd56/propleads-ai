import { inngest } from "./client";
import { searchSubreddit } from "@/lib/scraping/reddit";
import { detectIntent } from "@/lib/ai/intent-detector";
import { db } from "@/lib/db";

export const scrapeReddit = inngest.createFunction(
  { id: "scrape-reddit", concurrency: { limit: 2 } },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const sources = await step.run("get-active-sources", async () => {
      return db.scrapingSource.findMany({
        where: { platform: "REDDIT", isActive: true },
      });
    });

    let totalLeads = 0;

    for (const source of sources) {
      const run = await step.run(`create-run-${source.id}`, async () => {
        return db.scrapingRun.create({
          data: { sourceId: source.id, status: "RUNNING" },
        });
      });

      const posts = await step.run(`fetch-${source.id}`, async () => {
        return searchSubreddit(source.identifier, source.keywords, 25);
      });

      for (const post of posts) {
        await step.run(`analyze-${post.id}`, async () => {
          const text = `${post.title}\n\n${post.selftext}`;
          const intent = await detectIntent(text, "REDDIT");

          if (!intent.isPropertySeeker || intent.confidence < 0.5) return null;

          const lead = await db.lead.upsert({
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

          totalLeads++;
          return lead.id;
        });
      }

      await step.run(`complete-run-${run.id}`, async () => {
        await db.scrapingRun.update({
          where: { id: run.id },
          data: {
            status: "COMPLETED",
            postsScanned: posts.length,
            leadsFound: totalLeads,
            completedAt: new Date(),
            durationMs: Date.now() - new Date(run.startedAt).getTime(),
          },
        });
        await db.scrapingSource.update({
          where: { id: source.id },
          data: { lastRunAt: new Date(), lastRunLeads: totalLeads },
        });
      });
    }

    return { totalLeads, sourcesProcessed: sources.length };
  }
);
