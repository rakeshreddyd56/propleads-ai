# Agentic Scraping with Tiered Plans — Design Spec

## Goal

Build a tier-based scraping system for PropLeads AI where each plan unlocks more platforms, deeper retrieval, and smarter features. Manual trigger with clean run isolation, deduplication, and hot lead notifications. Public pricing page + internal plan selector. Hyderabad real estate premium positioning.

## Architecture Overview

```
Settings (Tier: Free/Starter/Growth/Pro)
         │
         ▼
Manual Trigger ("Run All" or per-source Play button)
         │
         ▼
Create RunGroup (tracks entire batch)
         │
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
 Source 1  Source 2  Source 3  Source N
 (own API  (own API  (own API  (sequential,
  call)     call)     call)     each 60s max)
    │         │        │        │
    └────┬────┴────────┴────────┘
         │
         ▼
  Post-level dedup (hash check)
         │
         ▼
  Intent Detection (Claude Haiku)
         │
         ▼
  Lead upsert (merge, don't overwrite)
         │
         ▼
  Auto-score if Growth/Pro tier
         │
         ▼
  If HOT lead → Slack/Email notification (Growth/Pro)
```

## Pricing & Plans

### Cost Structure

| Tool | Monthly Cost | Tier |
|---|---|---|
| Firecrawl web search | Free / ~₹1,400 at scale | Free+ |
| Reddit direct API | Free | Free+ |
| Apify Facebook Groups | ~₹2,500 | T1+ |
| Apify 99acres actor | ~₹2,500 | T1+ |
| Apify MagicBricks actor | ~₹3,500 | T1+ |
| Apify NoBroker actor | ~₹2,500 | T1+ |
| Apify Instagram | ~₹3,300 | T2+ |
| Apify Twitter | ~₹2,500 | T2+ |
| Apify YouTube | ~₹2,000 | T2+ |
| Apify LinkedIn | ~₹3,300 | T2+ |
| SerpAPI (real-time) | ~₹4,200 | T2+ |
| PhantomBuster | ~₹5,800 | T3 |
| Bright Data | ~₹8,300 | T3 |
| Apollo.io | ~₹4,200 | T3 |
| Hunter.io | ~₹2,500 | T3 |
| Claude AI (Haiku+Sonnet) | ~₹1,700-4,200 | All |

### Plans (500% margin, premium real estate positioning)

| | Free | Starter | Growth | Pro |
|---|---|---|---|---|
| Your cost | ~₹1,700 | ~₹12,500 | ~₹29,000 | ~₹50,000 |
| **Monthly** | **₹0** | **₹75,000/mo** | **₹1,75,000/mo** | **₹3,00,000/mo** |
| **Annual (20% off)** | **₹0** | **₹60,000/mo** | **₹1,40,000/mo** | **₹2,40,000/mo** |
| | | ₹7,20,000/yr | ₹16,80,000/yr | ₹28,80,000/yr |

### Plan Feature Matrix

| Feature | Free | Starter | Growth | Pro |
|---|---|---|---|---|
| **Sources** | | | | |
| Reddit + web search | Yes | Yes | Yes | Yes |
| 99acres, MagicBricks, NoBroker | - | Yes | Yes | Yes |
| Facebook Groups | - | Yes | Yes | Yes |
| Instagram, Twitter, YouTube | - | - | Yes | Yes |
| LinkedIn, Quora, Telegram | - | - | Yes | Yes |
| Real-time search (SerpAPI) | - | - | Yes | Yes |
| Social graph (PhantomBuster) | - | - | - | Yes |
| Deep scraping (Bright Data) | - | - | - | Yes |
| Contact enrichment (Apollo/Hunter) | - | - | - | Yes |
| **Limits** | | | | |
| Leads/month | ~50 | ~200 | ~500 | 1000+ |
| Runs/day | 2 | 5 | 10 | Unlimited |
| **Features** | | | | |
| AI intent detection | Yes | Yes | Yes | Yes |
| Manual Score & Match | Yes | Yes | Yes | Yes |
| Auto-score on scrape | - | - | Yes | Yes |
| Property brochure matching | Basic | Basic | AI-powered | AI-powered |
| Hot lead alerts (Slack/Email) | - | - | Yes | Yes |
| Cross-platform lead dedup | - | - | - | Yes |
| Contact info on leads | - | - | - | Yes |
| Daily lead digest | - | - | - | Yes |

## Data Model Changes

### New: RunGroup

```prisma
model RunGroup {
  id                 String   @id @default(cuid())
  orgId              String
  tier               PlanTier
  triggeredBy        String   @default("manual") // "manual" | "scheduled"
  sourcesTotal       Int      @default(0)
  sourcesCompleted   Int      @default(0)
  sourcesErrored     Int      @default(0)
  totalNewLeads      Int      @default(0)
  totalUpdatedLeads  Int      @default(0)
  status             RunGroupStatus @default(RUNNING)
  startedAt          DateTime @default(now())
  completedAt        DateTime?

  org                Organization @relation(fields: [orgId], references: [id])
  runs               ScrapingRun[]
}

enum RunGroupStatus {
  RUNNING
  COMPLETED
  PARTIAL
  FAILED
}

enum PlanTier {
  FREE
  STARTER
  GROWTH
  PRO
}
```

### Updated: ScrapingRun

Add fields:
```
runGroupId           String?
postsSkippedDup      Int @default(0)
leadsUpdated         Int @default(0)

runGroup             RunGroup? @relation(fields: [runGroupId], references: [id])
```

### Updated: Organization

Add fields:
```
planTier             PlanTier @default(FREE)
planBillingCycle     String   @default("monthly") // "monthly" | "annual"
runsToday            Int      @default(0)
runsResetAt          DateTime?
slackWebhookUrl      String?
notifyEmail          String?
```

### New: PostHash (deduplication)

```prisma
model PostHash {
  id        String   @id @default(cuid())
  orgId     String
  hash      String
  platform  Platform
  sourceUrl String?
  createdAt DateTime @default(now())

  @@unique([orgId, hash])
  @@index([orgId, platform])
}
```

### Updated: Lead

Add fields:
```
lastSeenAt           DateTime?  // last time this lead appeared in scraping
runGroupId           String?    // which run discovered this lead
source               String?    // e.g. "r/hyderabad", "99acres Gachibowli"
```

## Deduplication Strategy

### Layer 1: Post-level (before AI call)
- Hash: `sha256(platform + authorId + normalizedText.slice(0,200))`
- Check against `PostHash` table
- If exists → skip (no AI call wasted)
- If new → process + store hash

### Layer 2: Lead-level (on upsert)
- Unique key: `(orgId, platform, platformUserId)`
- On conflict → intelligent merge:
  - `originalText`: keep longer version
  - `preferredArea`: union of arrays
  - `budgetMin`: keep lower value
  - `budgetMax`: keep higher value
  - `intentSignals`: deep merge
  - `lastSeenAt`: update to now
  - Increment `leadsUpdated` counter on run

### Layer 3: Cross-platform (Pro tier only)
- After enrichment (Apollo/Hunter) provides email
- Match leads by email across platforms
- Create `LeadCluster` linking same-person leads
- Show as single lead card with "Also seen on: Reddit, Facebook"

## Tier Enforcement

### Runtime tier check

```typescript
const TIER_PLATFORMS: Record<PlanTier, Platform[]> = {
  FREE: ["REDDIT"],
  STARTER: ["REDDIT", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER", "FACEBOOK"],
  GROWTH: ["REDDIT", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER", "FACEBOOK",
           "INSTAGRAM", "TWITTER", "YOUTUBE", "LINKEDIN", "QUORA", "TELEGRAM"],
  PRO: [...all platforms],
};

const TIER_RUNS_PER_DAY: Record<PlanTier, number> = {
  FREE: 2, STARTER: 5, GROWTH: 10, PRO: 999,
};

const TIER_FEATURES: Record<PlanTier, string[]> = {
  FREE: ["intent_detection", "manual_score"],
  STARTER: ["intent_detection", "manual_score"],
  GROWTH: ["intent_detection", "manual_score", "auto_score", "notifications"],
  PRO: ["intent_detection", "manual_score", "auto_score", "notifications",
        "cross_platform_dedup", "contact_enrichment", "daily_digest"],
};
```

### Enforcement points
1. **Source creation**: Can only add sources for platforms in your tier
2. **Run trigger**: Check `runsToday < TIER_RUNS_PER_DAY[tier]`
3. **Run execution**: Skip sources whose platform exceeds current tier
4. **Auto-score**: Only runs post-scrape for Growth/Pro
5. **Notifications**: Only sent for Growth/Pro
6. **Enrichment**: Only called for Pro leads

## Search Query Strategy

### Broad queries (all tiers)
Property-context-enriched keywords. Example for an org with Gachibowli 2BHK properties:
```
"buying flat Hyderabad 2BHK"
"apartment Gachibowli under 1 crore"
"property Hyderabad invest"
```

### Targeted queries (Starter+)
Direct platform queries matching inventory:
```
site:99acres.com Gachibowli 2BHK flat
site:nobroker.in Hyderabad Kokapet villa owner
```

### Deep queries (Growth+, using SerpAPI)
Real-time, not cached by Google:
```
"looking for flat" "Hyderabad" after:2026-03-05
"want to buy" "Gachibowli OR Kokapet OR Financial District"
```

### Social graph queries (Pro, using PhantomBuster)
```
- Members of Facebook group "Hyderabad Real Estate Buyers"
- People who commented on 99acres Hyderabad listings
- Followers of @hyderabadrealty on Instagram
```

## Notification System

### Hot Lead Alert (Growth/Pro)
When a lead scores HOT (75+):
1. Check org has `slackWebhookUrl` or `notifyEmail`
2. Send notification with:
   - Lead name + platform + source
   - What they said (original text, truncated)
   - Score + top match property
   - Direct link to lead detail page

### Slack webhook payload
```json
{
  "text": "🔥 Hot Lead Found!",
  "blocks": [{
    "type": "section",
    "text": "**Rahul M** from Reddit r/hyderabad\n> Looking for 2BHK in Gachibowli, budget 80L-1Cr, need by June\n\nScore: 87 (HOT) · Best match: My Home Vihanga (82%)\n<https://propleads-ai.vercel.app/leads/xyz|View Lead>"
  }]
}
```

### Email notification (via Resend)
Same content, HTML formatted.

## UI Pages

### 1. Public Pricing Page (`/pricing`)
- Hero: "Find Qualified Buyers Before Your Competition"
- 4 plan cards (Free, Starter, Growth, Pro)
- Monthly/Annual toggle
- Feature comparison table
- "Start Free" / "Contact Sales" CTAs
- Testimonial/ROI section: "One ₹1Cr conversion = ₹2-3L commission"

### 2. Settings Plan Page (`/settings/plan`)
- Current plan badge
- Plan cards with "Current" / "Upgrade" buttons
- Monthly/Annual billing toggle
- Usage stats: runs today, leads this month, sources active
- Tier limits shown (runs/day, platforms available)
- Slack webhook URL input
- Notification email input

### 3. Updated Scraping Page
- Tier badge on header ("Growth Plan · 7/10 runs used today")
- Locked sources show upgrade prompt (padlock icon + "Upgrade to Starter")
- Run history section showing RunGroups with expandable source details
- Each RunGroup card shows: time, tier, sources, new/updated/skipped leads

### 4. Updated Leads Page
- Keep current card layout (already simplified)
- Add "Source" field showing where lead was found (e.g. "r/hyderabad", "99acres")
- Add "Last seen" timestamp
- Add "Also on" badges for cross-platform matches (Pro)
- Contact info section when enriched (Pro): email, phone, LinkedIn

## API Routes

### New
- `GET /api/plans` — return plan details and current org tier
- `POST /api/plans/upgrade` — change org tier
- `POST /api/scraping/run-group` — create RunGroup + trigger all eligible sources
- `GET /api/scraping/run-groups` — list run history with stats
- `GET /api/scraping/run-groups/:id` — single run group detail
- `POST /api/notifications/test` — test Slack/email notification
- `POST /api/enrichment/enrich-lead` — Pro: enrich single lead via Apollo/Hunter

### Updated
- `POST /api/scraping/run-source` — accept `runGroupId`, enforce tier
- `POST /api/leads/score-all` — auto-score behavior for Growth/Pro
- `GET /api/leads` — include `lastSeenAt`, `source` fields

## Implementation Order

1. **Schema + migrations** — new models, updated fields
2. **Tier enforcement** — config, runtime checks
3. **Run isolation** — RunGroup model, dedup hashes
4. **Updated engine** — tier-aware scraping, dedup, smart merge
5. **Pricing page** — public `/pricing`
6. **Settings plan page** — `/settings/plan` with tier selector
7. **Updated scraping page** — run history, locked sources, tier badge
8. **Updated leads page** — source field, last seen, contact info
9. **Notification system** — Slack webhook + Resend email
10. **Apify integration** — re-enable actors for Starter+ tiers
11. **SerpAPI integration** — real-time search for Growth+
12. **PhantomBuster + Bright Data** — social graph for Pro
13. **Apollo/Hunter enrichment** — contact info for Pro
14. **Cross-platform dedup** — lead clustering for Pro
