# Agentic Scraping with Tiered Plans — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tiered pricing plans (Free/Starter/Growth/Pro) to PropLeads AI with run isolation, deduplication, tier enforcement, pricing pages, and hot lead notifications.

**Architecture:** Prisma schema gains RunGroup (batch tracking), PostHash (dedup), PlanTier enum, and org-level tier settings. A tier config module controls which platforms/features are available. Engine is updated to check tiers, deduplicate posts, group runs, auto-score (Growth+), and send notifications (Growth+). Frontend gets a public pricing page, settings plan selector, and updated scraping/leads pages with tier awareness.

**Tech Stack:** Next.js 16 (App Router), Prisma 6 + PostgreSQL (Neon), Claude AI (Haiku/Sonnet), Clerk auth, Firecrawl, Apify, Resend (email), Slack webhooks, Tailwind CSS + shadcn/ui

---

## File Structure

### New Files
| File | Responsibility |
|---|---|
| `src/lib/scraping/tiers.ts` | Tier config: platforms, limits, features per tier |
| `src/lib/scraping/dedup.ts` | Post hashing + duplicate checking |
| `src/lib/scraping/run-group.ts` | RunGroup lifecycle: create, update, complete |
| `src/lib/notifications/slack.ts` | Slack webhook sender |
| `src/lib/notifications/email.ts` | Resend email sender |
| `src/lib/notifications/hot-lead.ts` | Hot lead notification orchestrator |
| `src/app/api/plans/route.ts` | GET current plan + all plan details |
| `src/app/api/plans/upgrade/route.ts` | POST change org tier |
| `src/app/api/scraping/run-group/route.ts` | POST create RunGroup + trigger sources |
| `src/app/api/scraping/run-groups/route.ts` | GET run history |
| `src/app/pricing/page.tsx` | Public pricing page (outside dashboard layout) |
| `src/app/(dashboard)/settings/plan/page.tsx` | Internal plan selector + notification config |

### Modified Files
| File | Changes |
|---|---|
| `prisma/schema.prisma` | Add RunGroup, PostHash models; PlanTier, RunGroupStatus enums; update Organization, ScrapingRun, Lead |
| `src/lib/scraping/engine.ts` | Tier checks, dedup, RunGroup linking, auto-score, notifications |
| `src/app/api/scraping/run-source/route.ts` | Accept runGroupId, enforce tier |
| `src/app/api/scraping/sources/route.ts` | Tier check on source creation |
| `src/app/api/leads/route.ts` | Return lastSeenAt, source fields |
| `src/app/(dashboard)/scraping/page.tsx` | Run history, locked sources, tier badge |
| `src/app/(dashboard)/leads/page.tsx` | Source field, last seen |

---

## Chunk 1: Schema + Tier Config + Dedup

### Task 1: Update Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new enums**

Add after existing enums (after line ~260):

```prisma
enum PlanTier {
  FREE
  STARTER
  GROWTH
  PRO
}

enum RunGroupStatus {
  RUNNING
  COMPLETED
  PARTIAL
  FAILED
}
```

- [ ] **Step 2: Add RunGroup model**

Add after ScrapingRun model:

```prisma
model RunGroup {
  id                String         @id @default(cuid())
  orgId             String
  tier              PlanTier
  triggeredBy       String         @default("manual")
  sourcesTotal      Int            @default(0)
  sourcesCompleted  Int            @default(0)
  sourcesErrored    Int            @default(0)
  totalNewLeads     Int            @default(0)
  totalUpdatedLeads Int            @default(0)
  status            RunGroupStatus @default(RUNNING)
  startedAt         DateTime       @default(now())
  completedAt       DateTime?

  org               Organization   @relation(fields: [orgId], references: [id], onDelete: Cascade)
  runs              ScrapingRun[]

  @@index([orgId, startedAt])
}
```

- [ ] **Step 3: Add PostHash model**

```prisma
model PostHash {
  id        String   @id @default(cuid())
  orgId     String
  hash      String
  platform  Platform
  createdAt DateTime @default(now())

  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([orgId, hash])
  @@index([orgId, platform])
}
```

- [ ] **Step 4: Update Organization model**

Add fields to Organization:

```prisma
  planTier          PlanTier @default(FREE)
  planBillingCycle  String   @default("monthly")
  runsToday         Int      @default(0)
  runsResetAt       DateTime?
  slackWebhookUrl   String?
  notifyEmail       String?

  runGroups         RunGroup[]
  postHashes        PostHash[]
```

- [ ] **Step 5: Update ScrapingRun model**

Add fields:

```prisma
  runGroupId        String?
  postsSkippedDup   Int      @default(0)
  leadsUpdated      Int      @default(0)

  runGroup          RunGroup? @relation(fields: [runGroupId], references: [id])
```

- [ ] **Step 6: Update Lead model**

Add fields:

```prisma
  lastSeenAt        DateTime?
  source            String?
  runGroupId        String?
```

- [ ] **Step 7: Run migration**

```bash
cd /Users/rakeshreddy/propleads-ai
npx prisma db push
npx prisma generate
```

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma
git commit -m "schema: add RunGroup, PostHash, PlanTier for tiered scraping"
```

---

### Task 2: Create Tier Config

**Files:**
- Create: `src/lib/scraping/tiers.ts`

- [ ] **Step 1: Write tier config**

```typescript
// src/lib/scraping/tiers.ts

export type PlanTier = "FREE" | "STARTER" | "GROWTH" | "PRO";

export const TIER_PLATFORMS: Record<PlanTier, string[]> = {
  FREE: ["REDDIT"],
  STARTER: [
    "REDDIT", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER",
    "FACEBOOK", "COMMONFLOOR",
  ],
  GROWTH: [
    "REDDIT", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER",
    "FACEBOOK", "COMMONFLOOR",
    "INSTAGRAM", "TWITTER", "YOUTUBE", "LINKEDIN", "QUORA", "TELEGRAM",
    "GOOGLE_MAPS",
  ],
  PRO: [
    "REDDIT", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER",
    "FACEBOOK", "COMMONFLOOR",
    "INSTAGRAM", "TWITTER", "YOUTUBE", "LINKEDIN", "QUORA", "TELEGRAM",
    "GOOGLE_MAPS",
  ],
};

export const TIER_RUNS_PER_DAY: Record<PlanTier, number> = {
  FREE: 2,
  STARTER: 5,
  GROWTH: 10,
  PRO: 999,
};

export const TIER_FEATURES: Record<PlanTier, string[]> = {
  FREE: ["intent_detection", "manual_score"],
  STARTER: ["intent_detection", "manual_score"],
  GROWTH: [
    "intent_detection", "manual_score", "auto_score",
    "notifications", "ai_matching",
  ],
  PRO: [
    "intent_detection", "manual_score", "auto_score",
    "notifications", "ai_matching",
    "cross_platform_dedup", "contact_enrichment", "daily_digest",
  ],
};

export const TIER_LEADS_PER_MONTH: Record<PlanTier, number> = {
  FREE: 50,
  STARTER: 200,
  GROWTH: 500,
  PRO: 9999,
};

export const PLAN_PRICING = {
  FREE: { monthly: 0, annual: 0, name: "Free", tagline: "Get started" },
  STARTER: {
    monthly: 75000,
    annual: 60000,
    name: "Starter",
    tagline: "For brokers & small agents",
  },
  GROWTH: {
    monthly: 175000,
    annual: 140000,
    name: "Growth",
    tagline: "For mid-size builders",
  },
  PRO: {
    monthly: 300000,
    annual: 240000,
    name: "Pro",
    tagline: "For large builders & enterprises",
  },
} as const;

export function isPlatformAllowed(tier: PlanTier, platform: string): boolean {
  return TIER_PLATFORMS[tier].includes(platform);
}

export function hasFeature(tier: PlanTier, feature: string): boolean {
  return TIER_FEATURES[tier].includes(feature);
}

export function canRunToday(tier: PlanTier, runsToday: number): boolean {
  return runsToday < TIER_RUNS_PER_DAY[tier];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/scraping/tiers.ts
git commit -m "feat: add tier config with platforms, limits, features, pricing"
```

---

### Task 3: Create Dedup Module

**Files:**
- Create: `src/lib/scraping/dedup.ts`

- [ ] **Step 1: Write dedup module**

```typescript
// src/lib/scraping/dedup.ts

import { createHash } from "crypto";
import { db } from "@/lib/db";

/**
 * Generate a hash for a scraped post to detect duplicates.
 * Normalizes text (lowercase, trim, collapse whitespace) before hashing.
 */
export function hashPost(
  platform: string,
  authorId: string,
  text: string
): string {
  const normalized = `${platform}|${authorId}|${text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 200)}`;
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Check which posts are new (not seen before) and record them.
 * Returns only the new posts that should be processed.
 */
export async function filterNewPosts<T extends { authorId: string; text: string }>(
  orgId: string,
  platform: string,
  posts: T[]
): Promise<{ newPosts: T[]; skippedCount: number }> {
  if (posts.length === 0) return { newPosts: [], skippedCount: 0 };

  // Hash all posts
  const postHashes = posts.map((p) => ({
    post: p,
    hash: hashPost(platform, p.authorId, p.text),
  }));

  // Check which hashes already exist
  const existingHashes = await db.postHash.findMany({
    where: {
      orgId,
      hash: { in: postHashes.map((ph) => ph.hash) },
    },
    select: { hash: true },
  });

  const existingSet = new Set(existingHashes.map((h) => h.hash));

  // Filter to only new posts
  const newEntries = postHashes.filter((ph) => !existingSet.has(ph.hash));
  const skippedCount = posts.length - newEntries.length;

  // Store new hashes
  if (newEntries.length > 0) {
    await db.postHash.createMany({
      data: newEntries.map((ph) => ({
        orgId,
        hash: ph.hash,
        platform: platform as any,
      })),
      skipDuplicates: true,
    });
  }

  return { newPosts: newEntries.map((e) => e.post), skippedCount };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/scraping/dedup.ts
git commit -m "feat: add post-level deduplication with SHA-256 hashing"
```

---

### Task 4: Create RunGroup Module

**Files:**
- Create: `src/lib/scraping/run-group.ts`

- [ ] **Step 1: Write RunGroup module**

```typescript
// src/lib/scraping/run-group.ts

import { db } from "@/lib/db";
import type { PlanTier } from "./tiers";

export async function createRunGroup(orgId: string, tier: PlanTier, sourcesTotal: number) {
  return db.runGroup.create({
    data: {
      orgId,
      tier,
      sourcesTotal,
      status: "RUNNING",
    },
  });
}

export async function markSourceCompleted(
  runGroupId: string,
  newLeads: number,
  updatedLeads: number
) {
  await db.runGroup.update({
    where: { id: runGroupId },
    data: {
      sourcesCompleted: { increment: 1 },
      totalNewLeads: { increment: newLeads },
      totalUpdatedLeads: { increment: updatedLeads },
    },
  });
}

export async function markSourceErrored(runGroupId: string) {
  await db.runGroup.update({
    where: { id: runGroupId },
    data: {
      sourcesErrored: { increment: 1 },
    },
  });
}

export async function completeRunGroup(runGroupId: string) {
  const group = await db.runGroup.findUnique({
    where: { id: runGroupId },
  });
  if (!group) return;

  const status =
    group.sourcesErrored === group.sourcesTotal
      ? "FAILED"
      : group.sourcesErrored > 0
        ? "PARTIAL"
        : "COMPLETED";

  return db.runGroup.update({
    where: { id: runGroupId },
    data: { status, completedAt: new Date() },
  });
}

export async function incrementOrgRunCount(orgId: string) {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { runsToday: true, runsResetAt: true },
  });

  // Reset counter if it's a new day
  const now = new Date();
  const resetAt = org?.runsResetAt;
  const isNewDay = !resetAt || resetAt.toDateString() !== now.toDateString();

  await db.organization.update({
    where: { id: orgId },
    data: {
      runsToday: isNewDay ? 1 : { increment: 1 },
      runsResetAt: isNewDay ? now : undefined,
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/scraping/run-group.ts
git commit -m "feat: add RunGroup lifecycle management"
```

---

## Chunk 2: Engine Update + Notifications

### Task 5: Create Notification Modules

**Files:**
- Create: `src/lib/notifications/slack.ts`
- Create: `src/lib/notifications/email.ts`
- Create: `src/lib/notifications/hot-lead.ts`

- [ ] **Step 1: Write Slack notifier**

```typescript
// src/lib/notifications/slack.ts

export async function sendSlackNotification(
  webhookUrl: string,
  lead: {
    name: string;
    platform: string;
    source: string;
    originalText: string;
    score: number;
    tier: string;
    matchName?: string;
    matchScore?: number;
    leadUrl: string;
  }
) {
  const tierEmoji = lead.tier === "HOT" ? "🔥" : lead.tier === "WARM" ? "☀️" : "❄️";

  const matchLine = lead.matchName
    ? `\n*Best match:* ${lead.matchName} (${lead.matchScore}%)`
    : "";

  const payload = {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `${tierEmoji} *${lead.tier} Lead Found — Score ${lead.score}*`,
            `*${lead.name}* from ${lead.platform} (${lead.source})`,
            `> ${lead.originalText.slice(0, 200)}${lead.originalText.length > 200 ? "..." : ""}`,
            matchLine,
            `<${lead.leadUrl}|View Lead>`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (e) {
    console.error("Slack notification failed:", e);
    return false;
  }
}
```

- [ ] **Step 2: Write email notifier**

```typescript
// src/lib/notifications/email.ts

export async function sendEmailNotification(
  to: string,
  lead: {
    name: string;
    platform: string;
    source: string;
    originalText: string;
    score: number;
    tier: string;
    matchName?: string;
    matchScore?: number;
    leadUrl: string;
  }
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("Resend not configured, skipping email notification");
    return false;
  }

  const matchLine = lead.matchName
    ? `<p><strong>Best match:</strong> ${lead.matchName} (${lead.matchScore}%)</p>`
    : "";

  const html = `
    <div style="font-family: sans-serif; max-width: 500px;">
      <h2 style="color: ${lead.tier === "HOT" ? "#dc2626" : "#f59e0b"}">
        ${lead.tier} Lead — Score ${lead.score}
      </h2>
      <p><strong>${lead.name}</strong> from ${lead.platform} (${lead.source})</p>
      <blockquote style="border-left: 3px solid #e5e7eb; padding-left: 12px; color: #6b7280;">
        ${lead.originalText.slice(0, 300)}
      </blockquote>
      ${matchLine}
      <p><a href="${lead.leadUrl}" style="color: #2563eb;">View Lead</a></p>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PropLeads <leads@propleads-ai.vercel.app>",
        to,
        subject: `${lead.tier} Lead: ${lead.name} looking for property in ${lead.source}`,
        html,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("Email notification failed:", e);
    return false;
  }
}
```

- [ ] **Step 3: Write hot lead orchestrator**

```typescript
// src/lib/notifications/hot-lead.ts

import { db } from "@/lib/db";
import { sendSlackNotification } from "./slack";
import { sendEmailNotification } from "./email";
import { hasFeature } from "@/lib/scraping/tiers";
import type { PlanTier } from "@/lib/scraping/tiers";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://propleads-ai.vercel.app";

export async function notifyIfHotLead(
  orgId: string,
  lead: {
    id: string;
    name: string | null;
    platform: string;
    source: string | null;
    originalText: string | null;
    score: number;
    tier: string;
  }
) {
  // Only notify for HOT leads
  if (lead.tier !== "HOT") return;

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { planTier: true, slackWebhookUrl: true, notifyEmail: true },
  });
  if (!org) return;

  // Only Growth+ gets notifications
  if (!hasFeature(org.planTier as PlanTier, "notifications")) return;

  // Get best property match
  const topMatch = await db.leadPropertyMatch.findFirst({
    where: { leadId: lead.id },
    orderBy: { matchScore: "desc" },
    include: { property: { select: { name: true } } },
  });

  const payload = {
    name: lead.name ?? "Unknown",
    platform: lead.platform,
    source: lead.source ?? lead.platform,
    originalText: lead.originalText ?? "",
    score: lead.score,
    tier: lead.tier,
    matchName: topMatch?.property.name,
    matchScore: topMatch?.matchScore,
    leadUrl: `${BASE_URL}/leads/${lead.id}`,
  };

  // Send both if configured
  const promises: Promise<boolean>[] = [];

  if (org.slackWebhookUrl) {
    promises.push(sendSlackNotification(org.slackWebhookUrl, payload));
  }
  if (org.notifyEmail) {
    promises.push(sendEmailNotification(org.notifyEmail, payload));
  }

  if (promises.length > 0) {
    await Promise.allSettled(promises);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/notifications/
git commit -m "feat: add hot lead notification system (Slack + Email)"
```

---

### Task 6: Update Scraping Engine

**Files:**
- Modify: `src/lib/scraping/engine.ts`

This is the most critical task. The engine needs:
1. Tier-aware source filtering
2. Post deduplication before AI calls
3. RunGroup tracking
4. Smart lead merge on upsert
5. Auto-score for Growth+ tiers
6. Hot lead notifications

- [ ] **Step 1: Update imports and constants**

At the top of `engine.ts`, add new imports after existing ones:

```typescript
import { filterNewPosts } from "./dedup";
import { createRunGroup, markSourceCompleted, markSourceErrored, completeRunGroup, incrementOrgRunCount } from "./run-group";
import { isPlatformAllowed, hasFeature, canRunToday, type PlanTier } from "./tiers";
import { notifyIfHotLead } from "@/lib/notifications/hot-lead";
```

- [ ] **Step 2: Update `runSingleSource` to accept runGroupId and tier**

Replace the `runSingleSource` function signature and add tier/dedup logic:

```typescript
export async function runSingleSource(
  orgId: string,
  sourceId: string,
  options?: { runGroupId?: string; tier?: PlanTier }
) {
  const source = await db.scrapingSource.findFirst({
    where: { id: sourceId, orgId },
  });
  if (!source) throw new Error("Source not found");

  // Check tier allows this platform
  const tier = options?.tier ?? "FREE";
  if (!isPlatformAllowed(tier, source.platform)) {
    return {
      sourceId: source.id,
      platform: source.platform,
      postsScanned: 0,
      leadsFound: 0,
      leadsUpdated: 0,
      skippedDup: 0,
      error: `Platform ${source.platform} requires ${getRequiredTier(source.platform)} plan`,
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
    const { newPosts, skippedCount } = await filterNewPosts(
      orgId,
      source.platform,
      posts
    );

    const limitedPosts = newPosts.slice(0, 8);
    let leadsFound = 0;
    let leadsUpdated = 0;

    for (const post of limitedPosts) {
      if (Date.now() - startTime > 50000) break;

      try {
        const intent = await detectIntentFast(post.text, source.platform);
        if (!intent.isPropertySeeker || intent.confidence < 0.5) continue;

        const result = await upsertLeadSmart(
          source.orgId,
          source.platform,
          post,
          intent,
          source.displayName
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

    // Update RunGroup if part of one
    if (options?.runGroupId) {
      await markSourceCompleted(options.runGroupId, leadsFound, leadsUpdated);
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
```

- [ ] **Step 3: Add smart upsert function**

Replace the existing `upsertLead` function with `upsertLeadSmart`:

```typescript
async function upsertLeadSmart(
  orgId: string,
  platform: string,
  post: ScrapedPost,
  intent: DetectedIntent,
  sourceName: string
) {
  const platformUserId = post.authorId || post.author;

  // Check if lead exists
  const existing = await db.lead.findUnique({
    where: {
      orgId_platform_platformUserId: { orgId, platform: platform as any, platformUserId },
    },
  });

  if (existing) {
    // Smart merge: keep best data from both
    const mergedAreas = [
      ...new Set([...(existing.preferredArea ?? []), ...(intent.preferredAreas ?? [])]),
    ];
    const keepLongerText =
      (post.text?.length ?? 0) > (existing.originalText?.length ?? 0)
        ? post.text.slice(0, 5000)
        : undefined;
    const widerBudgetMin =
      intent.budget.min && existing.budgetMin
        ? BigInt(Math.min(Number(existing.budgetMin), intent.budget.min))
        : intent.budget.min
          ? BigInt(intent.budget.min)
          : undefined;
    const widerBudgetMax =
      intent.budget.max && existing.budgetMax
        ? BigInt(Math.max(Number(existing.budgetMax), intent.budget.max))
        : intent.budget.max
          ? BigInt(intent.budget.max)
          : undefined;

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

  // Create new lead
  const lead = await db.lead.create({
    data: {
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
      lastSeenAt: new Date(),
      source: sourceName,
    },
  });
  return { lead, created: true };
}
```

- [ ] **Step 4: Add auto-score + notify helper**

```typescript
async function autoScoreAndNotify(orgId: string, leadId: string, tier: PlanTier) {
  try {
    const [lead, properties] = await Promise.all([
      db.lead.findUnique({ where: { id: leadId } }),
      db.property.findMany({ where: { orgId, status: "ACTIVE" } }),
    ]);
    if (!lead) return;

    const propertyAreas = [...new Set(properties.map((p) => p.area))];

    // Score
    const scoreResult = await scoreLead(
      {
        originalText: lead.originalText,
        budget: lead.budget,
        preferredArea: lead.preferredArea,
        timeline: lead.timeline,
        platform: lead.platform,
        buyerPersona: lead.buyerPersona,
      },
      propertyAreas
    );

    await db.lead.update({
      where: { id: lead.id },
      data: {
        score: scoreResult.total,
        scoreBreakdown: scoreResult.breakdown as any,
        tier: scoreResult.tier,
      },
    });

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
    }

    // Notify if HOT
    await notifyIfHotLead(orgId, {
      id: lead.id,
      name: lead.name,
      platform: lead.platform,
      source: lead.source,
      originalText: lead.originalText,
      score: scoreResult.total,
      tier: scoreResult.tier,
    });
  } catch (e) {
    console.error(`Auto-score error for lead ${leadId}:`, e);
  }
}
```

- [ ] **Step 5: Add helper to get required tier for a platform**

```typescript
function getRequiredTier(platform: string): string {
  if (["REDDIT"].includes(platform)) return "Free";
  if (["NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER", "FACEBOOK", "COMMONFLOOR"].includes(platform))
    return "Starter";
  return "Growth";
}
```

- [ ] **Step 6: Remove old `upsertLead` function**

Delete the old `upsertLead` function (lines ~415-441) since `upsertLeadSmart` replaces it.

- [ ] **Step 7: Commit**

```bash
git add src/lib/scraping/engine.ts
git commit -m "feat: tier-aware engine with dedup, smart merge, auto-score, notifications"
```

---

## Chunk 3: API Routes

### Task 7: Update run-source API

**Files:**
- Modify: `src/app/api/scraping/run-source/route.ts`

- [ ] **Step 1: Update to pass tier and runGroupId**

```typescript
// src/app/api/scraping/run-source/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { runSingleSource } from "@/lib/scraping/engine";
import { db } from "@/lib/db";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sourceId, runGroupId } = await req.json();
  if (!sourceId) return NextResponse.json({ error: "sourceId required" }, { status: 400 });

  // Get org tier
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { planTier: true },
  });

  const result = await runSingleSource(orgId, sourceId, {
    runGroupId,
    tier: (org?.planTier as any) ?? "FREE",
  });

  return NextResponse.json(result);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/scraping/run-source/route.ts
git commit -m "feat: run-source API passes tier and runGroupId"
```

---

### Task 8: Create RunGroup API

**Files:**
- Create: `src/app/api/scraping/run-group/route.ts`
- Create: `src/app/api/scraping/run-groups/route.ts`

- [ ] **Step 1: Write POST run-group (create + returns group)**

```typescript
// src/app/api/scraping/run-group/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { createRunGroup, incrementOrgRunCount } from "@/lib/scraping/run-group";
import { isPlatformAllowed, canRunToday, type PlanTier } from "@/lib/scraping/tiers";

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { planTier: true, runsToday: true, runsResetAt: true },
  });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const tier = org.planTier as PlanTier;

  // Check daily run limit
  const now = new Date();
  const isNewDay = !org.runsResetAt || org.runsResetAt.toDateString() !== now.toDateString();
  const currentRuns = isNewDay ? 0 : org.runsToday;

  if (!canRunToday(tier, currentRuns)) {
    return NextResponse.json({
      error: `Daily run limit reached (${currentRuns} runs today). Upgrade your plan for more.`,
    }, { status: 429 });
  }

  // Get eligible sources (active + allowed by tier)
  const allSources = await db.scrapingSource.findMany({
    where: { orgId, isActive: true },
  });

  const eligibleSources = allSources.filter((s) =>
    isPlatformAllowed(tier, s.platform)
  );

  const lockedSources = allSources.filter(
    (s) => !isPlatformAllowed(tier, s.platform)
  );

  if (eligibleSources.length === 0) {
    return NextResponse.json({ error: "No eligible sources for your plan" }, { status: 400 });
  }

  // Create RunGroup
  const runGroup = await createRunGroup(orgId, tier, eligibleSources.length);
  await incrementOrgRunCount(orgId);

  return NextResponse.json({
    runGroupId: runGroup.id,
    tier,
    eligible: eligibleSources.map((s) => ({
      id: s.id,
      platform: s.platform,
      displayName: s.displayName,
    })),
    locked: lockedSources.map((s) => ({
      id: s.id,
      platform: s.platform,
      displayName: s.displayName,
    })),
  });
}
```

- [ ] **Step 2: Write GET run-groups (history)**

```typescript
// src/app/api/scraping/run-groups/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "10");

  const groups = await db.runGroup.findMany({
    where: { orgId },
    orderBy: { startedAt: "desc" },
    take: limit,
    include: {
      runs: {
        include: {
          source: { select: { platform: true, displayName: true } },
        },
        orderBy: { startedAt: "asc" },
      },
    },
  });

  return NextResponse.json(groups);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/scraping/run-group/route.ts src/app/api/scraping/run-groups/route.ts
git commit -m "feat: add RunGroup API for batch run creation and history"
```

---

### Task 9: Create Plans API

**Files:**
- Create: `src/app/api/plans/route.ts`
- Create: `src/app/api/plans/upgrade/route.ts`

- [ ] **Step 1: Write GET plans**

```typescript
// src/app/api/plans/route.ts

import { NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  PLAN_PRICING, TIER_PLATFORMS, TIER_RUNS_PER_DAY,
  TIER_LEADS_PER_MONTH, TIER_FEATURES,
} from "@/lib/scraping/tiers";

export async function GET() {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      planTier: true,
      planBillingCycle: true,
      runsToday: true,
      slackWebhookUrl: true,
      notifyEmail: true,
    },
  });

  // Count leads this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const leadsThisMonth = await db.lead.count({
    where: { orgId, createdAt: { gte: startOfMonth } },
  });

  const plans = Object.entries(PLAN_PRICING).map(([tier, pricing]) => ({
    tier,
    ...pricing,
    platforms: TIER_PLATFORMS[tier as keyof typeof TIER_PLATFORMS],
    runsPerDay: TIER_RUNS_PER_DAY[tier as keyof typeof TIER_RUNS_PER_DAY],
    leadsPerMonth: TIER_LEADS_PER_MONTH[tier as keyof typeof TIER_LEADS_PER_MONTH],
    features: TIER_FEATURES[tier as keyof typeof TIER_FEATURES],
  }));

  return NextResponse.json({
    current: {
      tier: org?.planTier ?? "FREE",
      billingCycle: org?.planBillingCycle ?? "monthly",
      runsToday: org?.runsToday ?? 0,
      leadsThisMonth,
      slackWebhookUrl: org?.slackWebhookUrl ?? null,
      notifyEmail: org?.notifyEmail ?? null,
    },
    plans,
  });
}
```

- [ ] **Step 2: Write POST upgrade**

```typescript
// src/app/api/plans/upgrade/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const orgId = await resolveOrg();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tier, billingCycle, slackWebhookUrl, notifyEmail } = await req.json();

  const validTiers = ["FREE", "STARTER", "GROWTH", "PRO"];
  if (tier && !validTiers.includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const updateData: any = {};
  if (tier) updateData.planTier = tier;
  if (billingCycle) updateData.planBillingCycle = billingCycle;
  if (slackWebhookUrl !== undefined) updateData.slackWebhookUrl = slackWebhookUrl || null;
  if (notifyEmail !== undefined) updateData.notifyEmail = notifyEmail || null;

  const org = await db.organization.update({
    where: { id: orgId },
    data: updateData,
  });

  return NextResponse.json({
    tier: org.planTier,
    billingCycle: org.planBillingCycle,
    slackWebhookUrl: org.slackWebhookUrl,
    notifyEmail: org.notifyEmail,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/plans/
git commit -m "feat: add plans API for tier management and settings"
```

---

### Task 10: Update sources API with tier check

**Files:**
- Modify: `src/app/api/scraping/sources/route.ts`

- [ ] **Step 1: Add tier check on source creation**

In the POST handler, after `resolveOrg()`, add:

```typescript
import { isPlatformAllowed, type PlanTier } from "@/lib/scraping/tiers";

// Inside POST handler, before creating source:
const org = await db.organization.findUnique({
  where: { id: orgId },
  select: { planTier: true },
});

if (!isPlatformAllowed((org?.planTier ?? "FREE") as PlanTier, body.platform)) {
  return NextResponse.json(
    { error: `${body.platform} requires a higher plan. Upgrade to unlock.` },
    { status: 403 }
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/scraping/sources/route.ts
git commit -m "feat: enforce tier check on source creation"
```

---

### Task 11: Update leads API

**Files:**
- Modify: `src/app/api/leads/route.ts`

- [ ] **Step 1: Add lastSeenAt and source to response**

These fields are already on the Lead model (added in schema step). They'll be included automatically in the Prisma response. No code change needed for the existing GET route — Prisma includes all scalar fields by default.

Verify by checking the serialization block handles the new fields (it does — `...lead` spread captures them).

- [ ] **Step 2: Commit (skip if no changes needed)**

---

## Chunk 4: Frontend — Pricing + Settings

### Task 12: Public Pricing Page

**Files:**
- Create: `src/app/pricing/page.tsx`

- [ ] **Step 1: Write pricing page**

```tsx
// src/app/pricing/page.tsx

import Link from "next/link";

const plans = [
  {
    name: "Free",
    monthly: 0,
    annual: 0,
    tagline: "Get started with lead discovery",
    features: [
      "Reddit + web search",
      "Up to 50 leads/month",
      "2 runs/day",
      "AI intent detection",
      "Manual score & match",
    ],
    notIncluded: [
      "Property portal scraping",
      "Social media scraping",
      "Auto-scoring",
      "Hot lead alerts",
    ],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Starter",
    monthly: 37500,
    annual: 30000,
    tagline: "For brokers & small agents",
    features: [
      "Everything in Free",
      "99acres, MagicBricks, NoBroker",
      "Facebook Groups",
      "CommonFloor forums",
      "Up to 200 leads/month",
      "5 runs/day",
    ],
    notIncluded: [
      "Social media scraping",
      "Auto-scoring",
      "Hot lead alerts",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Growth",
    monthly: 175000,
    annual: 140000,
    tagline: "For mid-size builders",
    features: [
      "Everything in Starter",
      "Instagram, Twitter, YouTube",
      "LinkedIn, Quora, Telegram",
      "Real-time search (SerpAPI)",
      "Up to 500 leads/month",
      "10 runs/day",
      "Auto-score on scrape",
      "AI-powered property matching",
      "Hot lead alerts (Slack/Email)",
    ],
    notIncluded: [
      "Social graph analysis",
      "Contact enrichment",
    ],
    cta: "Upgrade to Growth",
    highlighted: true,
  },
  {
    name: "Pro",
    monthly: 300000,
    annual: 240000,
    tagline: "For large builders & enterprises",
    features: [
      "Everything in Growth",
      "Social graph analysis",
      "Deep scraping (Bright Data)",
      "Contact enrichment (email, phone)",
      "Cross-platform lead dedup",
      "1000+ leads/month",
      "Unlimited runs",
      "Daily lead digest",
    ],
    notIncluded: [],
    cta: "Contact Sales",
    highlighted: false,
  },
];

function formatPrice(amount: number) {
  if (amount === 0) return "Free";
  return `₹${(amount / 1000).toFixed(0)}K`;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
          Find Qualified Buyers Before Your Competition
        </h1>
        <p className="mt-4 text-lg text-zinc-600 max-w-2xl mx-auto">
          AI-powered lead discovery across 13+ platforms. Every lead is intent-verified
          and matched to your property inventory.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          One converted lead on a ₹1Cr property = ₹2-3L commission.
          PropLeads pays for itself with a single conversion.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col ${
                plan.highlighted
                  ? "border-zinc-900 ring-2 ring-zinc-900 relative"
                  : "border-zinc-200"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
                <p className="text-sm text-zinc-500 mt-1">{plan.tagline}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-zinc-900">
                    {formatPrice(plan.monthly)}
                  </span>
                  {plan.monthly > 0 && (
                    <span className="text-sm text-zinc-500">/month</span>
                  )}
                </div>
                {plan.annual > 0 && plan.annual < plan.monthly && (
                  <p className="text-xs text-green-600 mt-1">
                    {formatPrice(plan.annual)}/mo billed annually (save 20%)
                  </p>
                )}
              </div>

              <Link
                href="/sign-up"
                className={`block w-full text-center rounded-lg py-2.5 text-sm font-medium transition-colors ${
                  plan.highlighted
                    ? "bg-zinc-900 text-white hover:bg-zinc-800"
                    : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                }`}
              >
                {plan.cta}
              </Link>

              <div className="mt-6 flex-1">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-700">
                      <span className="text-green-500 mt-0.5">&#10003;</span>
                      {f}
                    </li>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-400">
                      <span className="mt-0.5">&#10007;</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/pricing/page.tsx
git commit -m "feat: add public pricing page with 4 tiers"
```

---

### Task 13: Settings Plan Page

**Files:**
- Create: `src/app/(dashboard)/settings/plan/page.tsx`

- [ ] **Step 1: Write settings plan page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, Crown, Zap, Rocket, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const planIcons = { FREE: Shield, STARTER: Zap, GROWTH: Rocket, PRO: Crown };

function formatINR(amount: number) {
  if (amount === 0) return "Free";
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${(amount / 1000).toFixed(0)}K`;
}

export default function PlanSettingsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [slackUrl, setSlackUrl] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setBillingCycle(d.current.billingCycle ?? "monthly");
        setSlackUrl(d.current.slackWebhookUrl ?? "");
        setNotifyEmail(d.current.notifyEmail ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function upgradeTo(tier: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/plans/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, billingCycle }),
      });
      if (res.ok) {
        toast.success(`Switched to ${tier} plan`);
        // Refresh data
        const d = await fetch("/api/plans").then((r) => r.json());
        setData(d);
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to upgrade");
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveNotifications() {
    setSaving(true);
    try {
      const res = await fetch("/api/plans/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slackWebhookUrl: slackUrl, notifyEmail }),
      });
      if (res.ok) toast.success("Notification settings saved");
      else toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const currentTier = data?.current?.tier ?? "FREE";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Plan & Settings</h1>
        <p className="text-sm text-zinc-500">
          Manage your subscription and notification preferences
        </p>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-zinc-500">Current Plan</p>
            <p className="text-xl font-bold">{currentTier}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-zinc-500">Runs Today</p>
            <p className="text-xl font-bold">{data?.current?.runsToday ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-zinc-500">Leads This Month</p>
            <p className="text-xl font-bold">{data?.current?.leadsThisMonth ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            billingCycle === "monthly"
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100"
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle("annual")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            billingCycle === "annual"
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100"
          )}
        >
          Annual
          <Badge variant="secondary" className="ml-2 text-[10px]">
            Save 20%
          </Badge>
        </button>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data?.plans?.map((plan: any) => {
          const Icon = planIcons[plan.tier as keyof typeof planIcons] ?? Shield;
          const isCurrent = plan.tier === currentTier;
          const price = billingCycle === "annual" ? plan.annual : plan.monthly;

          return (
            <Card
              key={plan.tier}
              className={cn(
                "relative",
                isCurrent && "ring-2 ring-zinc-900"
              )}
            >
              {isCurrent && (
                <Badge className="absolute -top-2.5 right-4 bg-zinc-900">
                  Current
                </Badge>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>
                <p className="text-xs text-zinc-500">{plan.tagline}</p>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold mb-1">{formatINR(price)}</p>
                {price > 0 && (
                  <p className="text-xs text-zinc-500 mb-4">
                    per month{billingCycle === "annual" ? ", billed annually" : ""}
                  </p>
                )}

                <div className="space-y-1 mb-4 text-xs text-zinc-600">
                  <p>{plan.platforms.length} platforms</p>
                  <p>{plan.runsPerDay === 999 ? "Unlimited" : plan.runsPerDay} runs/day</p>
                  <p>{plan.leadsPerMonth === 9999 ? "Unlimited" : plan.leadsPerMonth} leads/mo</p>
                </div>

                {!isCurrent && (
                  <Button
                    size="sm"
                    className="w-full"
                    variant={plan.tier === "FREE" ? "outline" : "default"}
                    disabled={saving}
                    onClick={() => upgradeTo(plan.tier)}
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : plan.tier === "FREE" ? (
                      "Downgrade"
                    ) : (
                      "Upgrade"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hot Lead Notifications</CardTitle>
          <p className="text-xs text-zinc-500">
            Get notified when a HOT lead is found.
            {!["GROWTH", "PRO"].includes(currentTier) && (
              <span className="text-amber-600"> Requires Growth plan or above.</span>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="slack">Slack Webhook URL</Label>
            <Input
              id="slack"
              placeholder="https://hooks.slack.com/services/..."
              value={slackUrl}
              onChange={(e) => setSlackUrl(e.target.value)}
              disabled={!["GROWTH", "PRO"].includes(currentTier)}
            />
          </div>
          <div>
            <Label htmlFor="email">Notification Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              disabled={!["GROWTH", "PRO"].includes(currentTier)}
            />
          </div>
          <Button
            size="sm"
            onClick={saveNotifications}
            disabled={saving || !["GROWTH", "PRO"].includes(currentTier)}
          >
            Save Notifications
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/settings/plan/page.tsx
git commit -m "feat: add settings plan page with tier selector and notification config"
```

---

## Chunk 5: Updated Scraping + Leads Pages

### Task 14: Update Scraping Page

**Files:**
- Modify: `src/app/(dashboard)/scraping/page.tsx`

Key changes:
1. Show current tier badge with runs remaining
2. Lock sources that exceed current tier (padlock + "Upgrade" label)
3. "Run All" creates a RunGroup then triggers eligible sources
4. Run history section showing recent RunGroups
5. Each RunGroup expandable showing per-source results

- [ ] **Step 1: Add tier state and RunGroup-based "Run All"**

At the top of the component, add state for tier and run history:

```typescript
const [tier, setTier] = useState<string>("FREE");
const [runsToday, setRunsToday] = useState(0);
const [maxRuns, setMaxRuns] = useState(2);
const [runHistory, setRunHistory] = useState<any[]>([]);
```

Add fetch for plan info and run history in useEffect:

```typescript
useEffect(() => {
  // Fetch sources
  fetch("/api/scraping/sources").then((r) => r.json()).then(setSources).finally(() => setLoading(false));
  // Fetch plan
  fetch("/api/plans").then((r) => r.json()).then((d) => {
    setTier(d.current.tier);
    setRunsToday(d.current.runsToday);
    const limits: Record<string, number> = { FREE: 2, STARTER: 5, GROWTH: 10, PRO: 999 };
    setMaxRuns(limits[d.current.tier] ?? 2);
  });
  // Fetch run history
  fetch("/api/scraping/run-groups?limit=5").then((r) => r.json()).then(setRunHistory);
}, []);
```

- [ ] **Step 2: Update "Run All" to use RunGroup**

Replace the `runAllSources` function:

```typescript
async function runAllSources() {
  setRunningAll(true);
  try {
    // Create RunGroup
    const groupRes = await fetch("/api/scraping/run-group", { method: "POST" });
    if (!groupRes.ok) {
      const err = await groupRes.json();
      toast.error(err.error ?? "Failed to start run");
      return;
    }
    const { runGroupId, eligible, locked } = await groupRes.json();

    if (locked.length > 0) {
      toast.info(`${locked.length} sources skipped (upgrade to unlock)`);
    }

    // Run eligible sources sequentially
    for (const source of eligible) {
      setRunningSources((prev) => new Set([...prev, source.id]));
      try {
        const res = await fetch("/api/scraping/run-source", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId: source.id, runGroupId }),
        });
        const result = await res.json();
        if (result.error) {
          toast.error(`${source.displayName}: ${result.error}`);
        } else {
          toast.success(
            `${source.displayName}: ${result.leadsFound} new, ${result.leadsUpdated ?? 0} updated, ${result.skippedDup ?? 0} skipped`
          );
        }
      } catch {
        toast.error(`${source.displayName}: failed`);
      }
      setRunningSources((prev) => { const s = new Set(prev); s.delete(source.id); return s; });
    }

    // Refresh
    await refreshSources();
    const history = await fetch("/api/scraping/run-groups?limit=5").then((r) => r.json());
    setRunHistory(history);
  } finally {
    setRunningAll(false);
  }
}
```

- [ ] **Step 3: Add tier badge in header**

In the header section, add after the title:

```tsx
<Badge variant="outline" className="ml-2">
  {tier} Plan · {runsToday}/{maxRuns === 999 ? "∞" : maxRuns} runs today
</Badge>
```

- [ ] **Step 4: Add locked source indicator**

In the SourceCard component, add lock indicator for platforms not in current tier. Use the tier config:

```typescript
const TIER_PLATFORMS: Record<string, string[]> = {
  FREE: ["REDDIT"],
  STARTER: ["REDDIT", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER", "FACEBOOK", "COMMONFLOOR"],
  GROWTH: ["REDDIT", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER", "FACEBOOK", "COMMONFLOOR",
           "INSTAGRAM", "TWITTER", "YOUTUBE", "LINKEDIN", "QUORA", "TELEGRAM", "GOOGLE_MAPS"],
  PRO: ["REDDIT", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER", "FACEBOOK", "COMMONFLOOR",
        "INSTAGRAM", "TWITTER", "YOUTUBE", "LINKEDIN", "QUORA", "TELEGRAM", "GOOGLE_MAPS"],
};

const isLocked = !TIER_PLATFORMS[tier]?.includes(source.platform);
```

Show lock overlay on card and disable Run button if locked.

- [ ] **Step 5: Add run history section**

After the sources grid, add:

```tsx
{/* Run History */}
<div className="mt-8">
  <h2 className="text-lg font-semibold mb-3">Run History</h2>
  <div className="space-y-3">
    {runHistory.map((group: any) => (
      <div key={group.id} className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant={
              group.status === "COMPLETED" ? "default" :
              group.status === "PARTIAL" ? "secondary" : "destructive"
            }>
              {group.status}
            </Badge>
            <span className="text-sm font-medium">
              {new Date(group.startedAt).toLocaleString()}
            </span>
            <Badge variant="outline" className="text-[10px]">{group.tier}</Badge>
          </div>
          <span className="text-sm text-zinc-500">
            {group.totalNewLeads} new · {group.totalUpdatedLeads} updated
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {group.runs?.map((run: any) => (
            <span key={run.id} className={cn(
              "text-xs px-2 py-1 rounded-full",
              run.status === "COMPLETED" ? "bg-green-50 text-green-700" :
              run.status === "FAILED" ? "bg-red-50 text-red-700" : "bg-zinc-100"
            )}>
              {run.source?.displayName ?? run.sourceId}: {run.leadsFound} leads
            </span>
          ))}
        </div>
      </div>
    ))}
    {runHistory.length === 0 && (
      <p className="text-sm text-zinc-400 text-center py-4">No runs yet</p>
    )}
  </div>
</div>
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/scraping/page.tsx
git commit -m "feat: tier-aware scraping page with RunGroup, locked sources, run history"
```

---

### Task 15: Update Leads Page

**Files:**
- Modify: `src/app/(dashboard)/leads/page.tsx`

- [ ] **Step 1: Show source and lastSeenAt on lead cards**

In the lead card, update Row 1 to show `lead.source`:

```tsx
{/* Row 1: Source + Platform */}
<div className="flex items-center gap-2 mb-1">
  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", pm.color)}>
    {pm.icon} {pm.label}
  </span>
  {lead.source && (
    <span className="text-xs text-zinc-400">{lead.source}</span>
  )}
  {lead.lastSeenAt && (
    <span className="text-[10px] text-zinc-300 ml-auto">
      Last seen {new Date(lead.lastSeenAt).toLocaleDateString()}
    </span>
  )}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/leads/page.tsx
git commit -m "feat: show source name and last seen on lead cards"
```

---

### Task 16: Add Settings link in sidebar

**Files:**
- Check existing sidebar/nav component and add link to `/settings/plan`

- [ ] **Step 1: Find and update sidebar navigation**

Look for the sidebar component (likely in `src/app/(dashboard)/layout.tsx` or a shared component). Add:

```tsx
{ name: "Plans & Settings", href: "/settings/plan", icon: Settings }
```

- [ ] **Step 2: Commit**

```bash
git add <sidebar-file>
git commit -m "feat: add Plans & Settings link to sidebar navigation"
```

---

## Chunk 6: Build + Deploy

### Task 17: Build, Test, Deploy

- [ ] **Step 1: Run Prisma migration**

```bash
cd /Users/rakeshreddy/propleads-ai
npx prisma db push
npx prisma generate
```

- [ ] **Step 2: Build**

```bash
PATH="/usr/local/Cellar/node/25.8.1/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:$PATH" npx next build
```

- [ ] **Step 3: Fix any build errors**

Iterate until build passes cleanly.

- [ ] **Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: complete tiered scraping system with plans, dedup, notifications"
```

- [ ] **Step 5: Push and deploy**

```bash
git push origin main
PATH="/usr/local/Cellar/node/25.8.1/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:$PATH" npx vercel --prod --yes
```

- [ ] **Step 6: Verify on production**

1. Visit `/pricing` — confirm 4 plan cards render
2. Visit `/settings/plan` — confirm tier selector works
3. Visit `/scraping` — confirm tier badge, locked sources, run history
4. Trigger a run — confirm RunGroup created, dedup works
5. Check `/leads` — confirm source field shows

---

## Future Plans (not in this implementation)

**Plan 2: Paid Tool Integrations**
- Re-enable Apify actors for Starter+ (rent specific actors)
- SerpAPI integration for Growth+ real-time search
- PhantomBuster for Pro social graph
- Bright Data for Pro deep scraping
- Apollo/Hunter for Pro contact enrichment

**Plan 3: Advanced Features**
- Cross-platform lead clustering (Pro)
- Daily digest email (Pro)
- Cron-based auto-scraping (all tiers)
- Payment integration (Razorpay/Stripe)
- Usage analytics dashboard
