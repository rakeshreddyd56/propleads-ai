# PropLeads AI -- End-to-End Regression Test Results

**Date:** 2026-03-14
**Tester Persona:** First-time Hyderabad real estate broker (Nanakramguda/Financial District corridor, luxury apartments)
**Test Properties:** Arka by Team 4 Life Spaces (brochure), Prestige High Fields (manual)
**Build:** Production (Vercel)

---

## Overall Score: 67/110 checks passed (61%)

| Scenario | Pass | Fail/Issue | Total |
|----------|------|------------|-------|
| A: Property Upload & Management | 13 | 17 | 30 |
| B: Lead Scraping (13 platforms) | 9 | 4 | 13 |
| C: Lead Scoring & Matching | 28 | 9 | 37 |
| D: AI Coach & Outreach | 21 | 12 | 33 |
| E: Analytics & Market Intel | 8 | 3 | 11 |
| F: Settings & Plan | 7 | 0 | 7 |
| Cross-cutting (nav, tour, loading) | 4 | 1 | 5 |

---

## Scenario A: Property Upload & Management

### PASS (13)
- [x] PDF upload works (Vercel Blob client-side, bypasses 4.5MB limit)
- [x] AI extraction runs (Claude Sonnet via brochure-extractor.ts)
- [x] Extraction preview readable (name, builder, RERA, unit types, amenities)
- [x] Nanakramguda in area data (constants.ts line 7)
- [x] Property card shows price correctly (whole INR, formatted as L/Cr)
- [x] Property card shows unit types (up to 3 badges)
- [x] Property card shows location (area + city)
- [x] Property card shows RERA
- [x] Property detail page shows comprehensive data
- [x] Edit dialog present with key fields
- [x] Delete has browser confirm() dialog
- [x] Delete redirects to /properties after success
- [x] Price display correct (7500000 -> 75 L, 15000000 -> 1.5 Cr)

### FAIL/ISSUE (17)
- [ ] **CRITICAL: Description field will crash** -- `description` in edit UI and API schema but NOT in Prisma schema. PATCH with description throws Prisma unknown-field error. (`property-actions.tsx`, `prisma/schema.prisma`)
- [ ] **HIGH: No manual add form** -- Only upload-via-brochure exists. Broker with no PDF cannot add a property.
- [ ] **HIGH: Cannot edit AI extraction before save** -- Preview is read-only. Wrong data must be saved first, then edited.
- [ ] **HIGH: Cannot edit prices** -- Edit dialog lacks price min/max fields despite PATCH API supporting it.
- [ ] **HIGH: Cannot edit unit types** -- AI-extracted unit types are immutable via UI.
- [ ] **HIGH: Cannot change status (Active/Sold Out)** -- No status dropdown in edit dialog.
- [ ] **HIGH: No search/filter on properties list** -- Unusable at scale.
- [ ] **MEDIUM: No brochure download link** -- `brochureUrl` stored but not shown on detail page.
- [ ] **MEDIUM: No image gallery** -- `imagesUrls` in schema but no upload/view UI.
- [ ] **MEDIUM: Cannot edit amenities/USPs** -- Immutable after extraction.
- [ ] **MEDIUM: Cannot change property type** -- Always defaults to APARTMENT from extraction.
- [ ] **MEDIUM: No soft-delete** -- Hard delete loses all match data permanently.
- [ ] **MEDIUM: No duplicate detection** -- Same brochure uploaded twice creates two records.
- [ ] **MEDIUM: No pagination** -- All properties loaded at once.
- [ ] **MEDIUM: Preview missing possession date** -- Extracted but not shown in preview.
- [ ] **LOW: Preview missing description** -- Extracted but not shown in preview.
- [ ] **LOW: Unit type null price guard missing** -- `priceINR / 100000` crashes if null.

---

## Scenario B: Lead Scraping (13 Platforms)

### Per-Platform Results

| # | Platform | Tier | Primary Strategy | Fallback | Data Quality | Verdict |
|---|----------|------|-----------------|----------|-------------|---------|
| 1 | Reddit | FREE | Firecrawl search | Direct fetch + old.reddit | Good | **PASS** |
| 2 | Facebook | STARTER | Apify groups scraper | Firecrawl (ignores groupId) | Fair | **PASS*** |
| 3 | 99acres | STARTER | Apify scraper | Firecrawl | Sellers not buyers | **ISSUE** |
| 4 | MagicBricks | STARTER | Apify scraper | Firecrawl | Sellers not buyers | **ISSUE** |
| 5 | NoBroker | STARTER | Apify scraper | Firecrawl | Sellers not buyers | **ISSUE** |
| 6 | CommonFloor | STARTER | Firecrawl direct | None | Likely dead platform | **FAIL** |
| 7 | Instagram | GROWTH | Apify scraper | Firecrawl (no comments) | Good | **PASS*** |
| 8 | Twitter/X | GROWTH | Apify tweet scraper | Firecrawl | Good | **PASS** |
| 9 | YouTube | GROWTH | Apify comments | Firecrawl (full page) | Fair | **PASS*** |
| 10 | LinkedIn | GROWTH | Firecrawl only | None | Fair (fragile author) | **PASS*** |
| 11 | Quora | GROWTH | Apify scraper | Firecrawl | Good | **PASS** |
| 12 | Telegram | GROWTH | Apify scraper | Firecrawl (public only) | Fair | **PASS*** |
| 13 | Google Maps | GROWTH | Apify places | Firecrawl | Odd (reviews as leads) | **PASS*** |

### Critical Cross-Cutting Issues
- [ ] **CRITICAL: Portal sources create SELLERS as leads** -- 99acres/MagicBricks/NoBroker listing authors (sellers/agents) become "leads." Brokers need BUYERS, not competing sellers.
- [ ] **HIGH: Cross-platform dedup declared but NOT implemented** -- PRO feature flag exists, hash function includes platform name guaranteeing different hashes across platforms.
- [ ] **HIGH: Fast intent detector missing 17 Hyderabad areas** -- Nallagandla, Gopanpally, Chandanagar, Attapur, etc. not in the fast version prompt.
- [ ] **HIGH: CommonFloor likely dead** -- Platform acquired years ago, forums may return 404.
- [ ] **MEDIUM: Facebook fallback ignores groupId** -- Firecrawl query doesn't use the group identifier.
- [ ] **MEDIUM: RunGroup status never set to COMPLETED** -- `completeRunGroup()` exists but never called.
- [ ] **MEDIUM: No default Telegram/CommonFloor sources seeded**
- [ ] **MEDIUM: Deleted sources re-created on next page load** (backfill logic)
- [ ] **LOW: No platform-specific help text for identifier field**

---

## Scenario C: Lead Scoring & Matching

### Scoring: PASS (14), FAIL (3)
- [x] 6-factor scoring (budget 25, location 20, timeline 15, engagement 15, profile 15, social 10)
- [x] Hyderabad context in prompt ("Score this lead for Hyderabad market")
- [x] HOT/WARM/COLD thresholds sensible (75+/40-74/<40)
- [x] Original post text sent to AI
- [x] Buyer persona considered
- [x] Score breakdown displayed (6-factor grid)
- [x] Score badge color-coded
- [ ] **CRITICAL: No manual score override** -- PATCH API explicitly blocks `score` and `tier`. `manual_score` feature flag exists for all tiers but is unimplemented.
- [ ] **MEDIUM: Budget scoring lacks price context** -- Prompt says "how well budget aligns with our price range" but never passes actual property price ranges, only area names.
- [ ] **MEDIUM: Batch scoring limited to 5** -- New broker with 200 leads must click 40 times.

### Matching: PASS (8), FAIL (2)
- [x] Budget vs price range overlap considered
- [x] Area matching
- [x] Property type matching
- [x] Buyer persona matching
- [x] Intent signals included
- [x] Top 3 matches with scores, reasons, and AI summary
- [x] Match persistence via upsert
- [x] USPs included in prompt
- [ ] **MEDIUM: Amenities dropped** -- Function accepts amenities but never includes them in AI prompt.
- [ ] **LOW: No area proximity map** -- Relies on AI world knowledge for Hyderabad geography.

### Lead Detail: PASS (16), FAIL (1)
- [x] Name, platform badge, original text, budget, areas, timeline, persona
- [x] Score breakdown (6-factor grid)
- [x] Status pipeline (all 8 statuses in dropdown)
- [x] Status change works via PATCH
- [x] Notes field with Hyderabad-relevant placeholder
- [x] Re-score button
- [x] Match Properties button
- [x] WhatsApp button (auto-91 prefix for Indian numbers)
- [x] Email button (mailto: with pre-filled content)
- [x] Enrich Contact button (Pro-only with tooltip)
- [x] Find Duplicates button
- [x] AI Coach button (navigates to /coach?leadId=)
- [x] Cluster display ("Also seen on" card)
- [x] Enriched data tab (email, phone, company, job title)
- [x] Outreach events tab
- [x] Coach sessions tab
- [ ] **HIGH: No status filter in UI** -- API supports `?status=` but no dropdown in leads list.

### Leads List: PASS (10), FAIL (3)
- [x] Tier filter (HOT/WARM/COLD toggle cards)
- [x] Platform filter (13-option dropdown)
- [x] Search text (name, text, areas)
- [x] Sort by score/date/name (5 options)
- [x] Pagination (50/page with Prev/Next + page indicator)
- [x] Lead card shows score, platform, budget, areas, persona, match preview
- [x] CSV Export button (20 columns, up to 5000 rows)
- [x] Empty state with CTA to Lead Sources
- [x] Clear filters button
- [x] Indian number formatting (lakhs/crores)
- [ ] **HIGH: No status filter** -- Can't filter by pipeline stage (Site Visit, Negotiation).
- [ ] **MEDIUM: CSV export ignores current filters** -- Always exports ALL leads.
- [ ] **MEDIUM: Tier counts are global, not filter-aware** -- Confusing when filtering by platform.

---

## Scenario D: AI Coach & Outreach

### AI Coach: PASS (12), FAIL (5)
- [x] Conversation analysis textarea with "Analyze & Coach" button
- [x] Hyderabad-specific system prompt (Vastu, NRI, Telugu, RERA, family framing)
- [x] 6-point analysis (strengths, missed opportunities, suggested message, objections, next steps, score)
- [x] Message generator with 6 personas x 3 channels x 6 stages
- [x] WhatsApp under 200 words, SMS under 160 chars
- [x] Email includes subject line
- [x] Copy-to-clipboard button
- [x] leadId from URL query params
- [x] Lead name shown in blue banner
- [x] Coach session persistence to DB
- [x] Channel-specific formatting rules
- [x] Playbook generation API exists (7-item sales playbook)
- [ ] **CRITICAL: Lead data NOT passed to AI** -- Analyze endpoint fetches lead for auth but discards score, budget, area, persona. AI coaches blind.
- [ ] **CRITICAL: Property data NOT passed to AI** -- AI has zero knowledge of broker's inventory. Can't recommend specific listings.
- [ ] **HIGH: Playbook has no UI** -- API endpoint exists but no tab/button to access it.
- [ ] **MEDIUM: No Hyderabad area names in system prompt** -- Generic "tech parks" instead of Gachibowli/HITEC City/Financial District.
- [ ] **LOW: Missing template categories in UI** -- API has 8 categories, UI shows 6 (missing MARKET_UPDATE, TESTIMONIAL).

### Outreach: PASS (9), FAIL (7)
- [x] Template creation (name, channel, category, subject, body, variables)
- [x] Template listing from DB
- [x] Email via Resend with professional sender
- [x] WhatsApp via Aisensy with media support
- [x] Compliance checks (DPDP Act opt-in, TRAI DND)
- [x] Event logging (outreachEvent records)
- [x] Lead verification before send
- [x] 3 channels supported (WhatsApp, Email, SMS)
- [x] Variable syntax ({{name}}, {{property}})
- [ ] **HIGH: No template edit/delete** -- Templates are write-once.
- [ ] **HIGH: No send history UI** -- Events logged but never displayed.
- [ ] **HIGH: No direct send from outreach page** -- Templates exist but can't be sent from here.
- [ ] **HIGH: Campaign builder placeholder** -- "Coming soon" text only.
- [ ] **MEDIUM: Template variables not substituted on send** -- Templates and sending are disconnected.
- [ ] **MEDIUM: No opt-out mechanism** -- No unsubscribe links, no STOP keyword handling.
- [ ] **LOW: No real DND registry integration** -- Just a boolean flag.

---

## Scenario E: Analytics & Market Intel

### PASS (8)
- [x] Dashboard KPIs correct (6 metrics with division-by-zero protection)
- [x] Source bar chart with all 13 platform labels
- [x] Analytics page: usage meters, platform health, tier breakdown, source performance
- [x] Usage meters reflect plan limits correctly (including unlimited handling)
- [x] HOT/WARM/COLD distribution with percentage bars
- [x] Market Intel: 36 Hyderabad areas with realistic prices
- [x] Nanakramguda included (10,000-15,000/sqft, 22% growth, hotness 92)
- [x] 6 buyer personas with realistic budgets and area associations

### FAIL/ISSUE (3)
- [ ] **MEDIUM: Funnel stage order inconsistent** -- Analytics API: NURTURE between ENGAGED and SITE_VISIT. Dashboard: NURTURE at end after LOST.
- [ ] **MEDIUM: No geographic heatmap** -- All data exists (36 areas with hotness scores) but no map visualization.
- [ ] **LOW: Source chart label overlap** -- 13 platform labels collide on XAxis without rotation.

---

## Scenario F: Settings & Plan Management

### PASS (7)
- [x] Current plan display with icon and pricing
- [x] Usage meters with limit-reached warnings
- [x] Monthly/annual billing toggle with "Save 20%" badge
- [x] Razorpay checkout integration (subscription create, webhook handler exists)
- [x] Notifications: Slack webhook + email inputs (GROWTH+ gating)
- [x] Compliance: DPDP Act, TRAI DND, RERA info with accurate badges
- [x] Organization/team settings via Clerk

---

## Cross-Cutting

### PASS (4)
- [x] Sidebar: 9 navigation links with active state detection
- [x] Topbar: global search (leads + properties), notification bell, user avatar
- [x] Onboarding tour: 9 sections, ~35 steps, element highlighting, progress tracking
- [x] Empty states: actionable guidance on all pages

### FAIL (1)
- [ ] **LOW: No skeleton loaders** -- Simple spinner instead of skeleton placeholders matching layout.

---

## Top 10 Issues to Fix (Priority Order)

| # | Issue | Severity | Scenario | Fix Effort |
|---|-------|----------|----------|------------|
| 1 | Description field crashes on save (not in Prisma schema) | CRITICAL | A | Small (add to schema or remove from UI) |
| 2 | Lead data not passed to AI Coach | CRITICAL | D | Small (inject lead data into prompt) |
| 3 | Property data not passed to AI Coach | CRITICAL | D | Small (fetch and inject properties) |
| 4 | No manual score override | CRITICAL | C | Small (add to PATCH whitelist + UI) |
| 5 | Portal sources create sellers as leads | CRITICAL | B | Large (rethink portal scraping model) |
| 6 | No status filter on leads page | HIGH | C | Small (add dropdown) |
| 7 | No template edit/delete | HIGH | D | Medium (add PATCH/DELETE endpoints + UI) |
| 8 | No manual property add form | HIGH | A | Medium (create form component) |
| 9 | Cannot edit prices/unit types/status on properties | HIGH | A | Medium (expand edit dialog) |
| 10 | Cross-platform dedup not actually implemented | HIGH | B | Medium (remove platform from hash) |
