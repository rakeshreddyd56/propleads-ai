# Paid Tool Integrations — Implementation Plan

> **Goal:** Replace all Firecrawl-placeholder scrapers with production-grade Apify actors + add SerpAPI enhanced search + Apollo/Hunter contact enrichment. Each platform gets a proper scraper with real data extraction, not web search hacks.

**Architecture:**
- Each platform scraper: Apify actor (primary) → Firecrawl web search (fallback)
- SerpAPI: real-time Google search for Growth+ tier, feeds into intent detection
- Apollo/Hunter: contact enrichment pipeline for Pro tier leads
- All Apify calls go through upgraded `apify.ts` client with cost tracking and timeouts

**Verified Apify Actors (all confirmed via API):**

| Platform | Actor ID | Pricing |
|----------|---------|---------|
| Instagram | `apify/instagram-scraper` | $0.0027/result |
| Twitter/X | `apidojo/tweet-scraper` | Pay-per-event |
| Google Maps | `compass/crawler-google-places` | $0.50 min + per place |
| Facebook Groups | `apify/facebook-groups-scraper` | $0.0033/post |
| Facebook Posts | `apify/facebook-posts-scraper` | Pay-per-event |
| YouTube Comments | `streamers/youtube-comments-scraper` | $0.002/comment |
| Telegram | `tri_angle/telegram-scraper` | $0.0002/result |
| LinkedIn Profiles | `dev_fusion/linkedin-profile-scraper` | Pay-per-event |
| Quora | `jupri/quora-scraper` | $30/month flat |
| 99acres | `easyapi/99acres-com-scraper` | $19.99/month |
| MagicBricks | `ecomscrape/magicbricks-property-search-scraper` | $10/month |
| NoBroker | `ecomscrape/nobroker-property-search-scraper` | $20/month |

---

## Task 1: Upgrade Apify Client (`src/lib/scraping/apify.ts`)

**What:** Rewrite the Apify REST client with proper error handling, cost tracking, and configurable timeouts per actor.

**Changes:**
- Add `runApifyActorSync()` - starts run and waits for completion (polling)
- Add `runApifyActorAsync()` - starts run and returns runId (for long-running actors)
- Add per-actor timeout config (Google Maps needs 120s, others 60s)
- Add retry logic (1 retry on transient errors)
- Update APIFY_ACTORS map with correct, verified actor IDs
- Add `isApifyConfigured()` check

## Task 2: Rewrite Property Portal Scrapers

### 2a: 99acres (`platforms/ninety-nine-acres.ts`)
- Primary: Apify actor `easyapi/99acres-com-scraper` with startUrls pointing to 99acres search page
- Input: `{ startUrls: [{ url: "https://www.99acres.com/search/property/buy/{city}?..." }], maxItems: limit }`
- Extract: title, price, location, area, BHK, sqft, seller name, listing URL
- Fallback: existing Firecrawl web search

### 2b: MagicBricks (`platforms/magicbricks.ts`)
- Primary: Apify actor `ecomscrape/magicbricks-property-search-scraper`
- Input: `{ startUrls: [{ url: "https://www.magicbricks.com/property-for-sale/..." }], maxItems: limit }`
- Fallback: Firecrawl

### 2c: NoBroker (`platforms/nobroker.ts`)
- Primary: Apify actor `ecomscrape/nobroker-property-search-scraper`
- Input: `{ startUrls: [{ url: "https://www.nobroker.in/property/sale/..." }], maxItems: limit }`
- Fallback: Firecrawl

## Task 3: Rewrite Social Media Scrapers

### 3a: Instagram (`platforms/instagram.ts`)
- Primary: Apify `apify/instagram-scraper`
- Input for hashtag: `{ hashtags: ["hyderabadrealestate"], resultsLimit: limit }`
- Input for profile: `{ usernames: [identifier], resultsLimit: limit }`
- Extract: post text (caption), author username, likes, comments array, post URL, timestamp
- Map comments to separate ScrapedPost entries for intent detection

### 3b: Twitter/X (`platforms/twitter.ts`)
- Primary: Apify `apidojo/tweet-scraper`
- Input: `{ startUrls: [{ url: "https://x.com/search?q={query}&f=live" }], maxItems: limit }`
- Extract: full_text, user screen_name, likes, retweets, created_at, tweet URL
- Also capture reply threads

### 3c: YouTube Comments (`platforms/youtube.ts`)
- Primary: Apify `streamers/youtube-comments-scraper`
- Input: `{ startUrls: [{ url: "https://www.youtube.com/results?search_query={query}" }], maxComments: limit }`
- Extract: comment text, author name, video title, video URL, likes, timestamp

### 3d: Facebook Groups (`platforms/facebook.ts`)
- Primary: Apify `apify/facebook-groups-scraper`
- Input: `{ startUrls: [{ url: "https://www.facebook.com/groups/{groupId}" }], maxPosts: limit }`
- Note: May need cookies for private groups
- Extract: post text, author name, comments, reactions, timestamp

### 3e: LinkedIn (`platforms/linkedin.ts`)
- Primary: Apify `dev_fusion/linkedin-profile-scraper` for profile enrichment
- For posts: Use SerpAPI Google search with site:linkedin.com/posts (more reliable)
- Extract: post text, author, title, engagement

### 3f: Telegram (`platforms/telegram.ts`)
- Primary: Apify `tri_angle/telegram-scraper`
- Input: `{ channelUsername: identifier, maxMessages: limit }`
- Extract: message text, sender name, date, views, channel name

### 3g: Quora (`platforms/quora.ts`)
- Primary: Apify `jupri/quora-scraper`
- Input: `{ searchQuery: query, maxQuestions: limit }`
- Extract: question, answers, author, follower count

### 3h: Google Maps (`platforms/google-maps.ts`)
- Primary: Apify `compass/crawler-google-places`
- Input: `{ searchStringsArray: ["{query} Hyderabad"], maxCrawledPlacesPerSearch: limit, maxReviews: 5, language: "en", proxyConfig: { useApifyProxy: true } }`
- Extract: place name, address, phone, website, rating, reviews with text+author+rating

## Task 4: Add SerpAPI Client (`src/lib/scraping/serpapi.ts`)

**What:** New module for SerpAPI integration — real-time Google search with structured results.

- `searchGoogle(query, options)` — Google Search API
- `searchGoogleMaps(query, location)` — Google Maps search with reviews
- `searchGoogleNews(query)` — Real estate news/trends
- Config: SERPAPI_API_KEY env var
- Used by Growth+ tier for enhanced search capability
- Fallback: Firecrawl searchWeb

## Task 5: Add Contact Enrichment Pipeline (`src/lib/enrichment/`)

### 5a: Apollo client (`src/lib/enrichment/apollo.ts`)
- `enrichByName(name, location)` — People search by name + Hyderabad
- `enrichByLinkedIn(linkedinUrl)` — Get email/phone from LinkedIn URL
- `enrichByEmail(email)` — Get full profile from email
- Returns: email, phone, company, title, LinkedIn URL

### 5b: Hunter client (`src/lib/enrichment/hunter.ts`)
- `findEmail(name, domain)` — Find email for name at company
- `verifyEmail(email)` — Check deliverability
- Returns: email, confidence score, verification status

### 5c: Enrichment orchestrator (`src/lib/enrichment/index.ts`)
- `enrichLead(lead)` — Takes a lead, tries Apollo first, Hunter for email verification
- Updates lead record with enriched contact info
- Only runs for Pro tier (checked via `hasFeature(tier, "contact_enrichment")`)

### 5d: Schema update
- Add to Lead model: `email`, `phone`, `company`, `jobTitle`, `enrichedAt`, `enrichmentSource`

## Task 6: API Routes for Enrichment

- `POST /api/leads/[id]/enrich` — Enrich a single lead
- `POST /api/leads/enrich-batch` — Enrich all unenriched HOT leads (Pro tier)
- Returns enrichment results with found contact info

## Task 7: Update Engine & Integration

- Update `engine.ts` to use new Apify-based scrapers (they return richer data)
- Update `autoScoreAndNotify()` to trigger enrichment for Pro tier HOT leads
- Add SERPAPI_API_KEY to env template
- Update tiers.ts to add `serpapi_search` feature for Growth+

## Task 8: Dashboard Updates

- Show enriched contact info on lead detail page (email, phone, company)
- Add "Enrich" button on lead cards for Pro tier
- Show Apify vs Firecrawl source indicator on scraping page

## Task 9: Build, Test, Deploy
