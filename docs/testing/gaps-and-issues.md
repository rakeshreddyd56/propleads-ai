# PropLeads AI -- Gaps & Issues (Prioritized)

**Date:** 2026-03-14
**Total Issues Found:** 55

---

## P0 -- CRITICAL (Fix Immediately) -- 5 issues

### 1. Description field crashes on save
**File:** `prisma/schema.prisma` (Property model missing `description` field)
**Repro:** Edit any property -> type in Description field -> click Save
**Impact:** Prisma throws "Unknown arg `description`" error. Edit dialog becomes unusable.
**Fix:** Add `description String?` to Property model in Prisma schema, run `prisma db push`.

### 2. AI Coach ignores lead data
**File:** `src/app/api/coach/analyze/route.ts` (line ~25)
**Repro:** Navigate to a lead -> click "AI Coach" -> paste conversation -> Analyze
**Impact:** The endpoint fetches lead for auth check but discards ALL lead data (score, budget, areas, persona, intent signals). The AI coaches without knowing who the lead is.
**Fix:** Include lead.score, lead.budgetMin/Max, lead.preferredArea, lead.buyerPersona, lead.intentSignals in the `analyzeConversation()` call.

### 3. AI Coach has no property context
**File:** `src/lib/ai/conversation-coach.ts`
**Repro:** Use AI Coach for any conversation
**Impact:** The AI cannot recommend specific properties, mention prices, RERA numbers, or USPs from the broker's inventory. All coaching is generic.
**Fix:** Fetch active properties for the org and inject into the system prompt.

### 4. No manual score override
**File:** `src/app/api/leads/[id]/route.ts` (line 66-72)
**Repro:** Try to change a lead's score from the UI
**Impact:** `score` and `tier` are explicitly blocked from PATCH. `manual_score` feature flag exists for all tiers but is never checked. Broker cannot override AI scores based on personal knowledge.
**Fix:** Add `score` and `tier` to allowed PATCH fields (or add a separate manual override field).

### 5. Portal scraping creates sellers as leads
**Files:** `src/lib/scraping/platforms/ninety-nine-acres.ts`, `magicbricks.ts`, `nobroker.ts`
**Repro:** Run 99acres/MagicBricks/NoBroker scraping
**Impact:** Listing authors (sellers/owners/agents) become "leads." Brokers need buyers, not competing sellers. Most portal posts will be filtered out by intent detection ("not a buyer"), resulting in nearly zero leads despite many posts scanned.
**Fix:** Rethink portal scraping -- focus on "wanted" posts, buyer inquiry sections, or reposition these as "market data" rather than "leads."

---

## P1 -- HIGH (Fix This Sprint) -- 12 issues

### 6. No status filter on leads page
**File:** `src/app/(dashboard)/leads/page.tsx`
**Impact:** Broker with 200 leads can't filter by pipeline stage (Site Visit, Negotiation, etc.)
**Fix:** Add status dropdown filter, API already supports `?status=`.

### 7. No template edit/delete
**File:** `src/app/api/outreach/templates/route.ts`
**Impact:** Templates are write-once. Can't fix typos or remove outdated ones.
**Fix:** Add PATCH and DELETE handlers + UI buttons.

### 8. No manual property add form
**File:** `src/app/(dashboard)/properties/page.tsx`
**Impact:** Broker without a PDF brochure cannot add a property at all.
**Fix:** Add "Add Property" button with a form dialog (name, builder, area, price, unit types, etc.)

### 9. Cannot edit prices/unit types on properties
**Files:** `src/components/properties/property-actions.tsx`
**Impact:** If AI extracts wrong prices or unit types, broker is stuck with incorrect data.
**Fix:** Expand edit dialog to include price min/max, unit types editor, amenities, status.

### 10. Cannot change property status (Active/Sold Out)
**File:** `src/components/properties/property-actions.tsx`
**Impact:** When a project sells out, broker can't update status via UI.
**Fix:** Add status dropdown to edit dialog (PATCH API already supports it).

### 11. Cross-platform dedup not implemented
**File:** `src/lib/scraping/dedup.ts`
**Impact:** PRO feature "cross_platform_dedup" is declared but hash includes platform name, guaranteeing different hashes across platforms. Feature is paid for but non-functional.
**Fix:** Remove platform from hash key OR implement a separate cross-platform hash.

### 12. Playbook generation has no UI
**File:** `src/app/(dashboard)/coach/page.tsx`
**Impact:** Excellent 7-item sales playbook API exists but no tab/button. Invisible to brokers.
**Fix:** Add "Generate Playbook" tab to coach page.

### 13. No send history UI on outreach page
**File:** `src/app/(dashboard)/outreach/page.tsx`
**Impact:** outreachEvent records are logged but never displayed. Broker can't see sent messages.
**Fix:** Add "History" tab showing recent outreach events.

### 14. No direct send from outreach page
**File:** `src/app/(dashboard)/outreach/page.tsx`
**Impact:** Templates exist but can't be sent to a lead from this page.
**Fix:** Add lead selector + "Send" button on each template card.

### 15. AI extraction preview not editable
**File:** `src/components/properties/upload-dialog.tsx`
**Impact:** Wrong AI extractions must be saved first, then edited -- but many fields (unit types, amenities) can't be edited at all.
**Fix:** Make preview fields editable before save.

### 16. Fast intent detector missing 17 areas
**File:** `src/lib/ai/intent-detector.ts`
**Impact:** Posts mentioning Nallagandla, Gopanpally, Chandanagar, Attapur, etc. won't have areas detected.
**Fix:** Add all 41 area names to the fast mode prompt (same as parser list).

### 17. No search/filter on properties list
**File:** `src/app/(dashboard)/properties/page.tsx`
**Impact:** Broker with 30+ properties has no way to quickly find one.
**Fix:** Add search bar and area/status/type filters.

---

## P2 -- MEDIUM (Fix Next Sprint) -- 18 issues

### 18. Funnel stage order inconsistent
**File:** `src/app/api/analytics/funnel/route.ts` (line 9)
**Impact:** Analytics shows NURTURE between ENGAGED and SITE_VISIT; dashboard shows it at end.
**Fix:** Standardize order: NEW, CONTACTED, ENGAGED, SITE_VISIT, NEGOTIATION, CONVERTED, LOST, NURTURE.

### 19. Budget scoring lacks price context
**File:** `src/lib/ai/lead-scorer.ts`
**Impact:** AI asked "how well budget aligns with our price range" but never given actual price range.
**Fix:** Fetch and include property price ranges in scoring prompt.

### 20. Amenities dropped from matching prompt
**File:** `src/lib/ai/property-matcher.ts` (line 16-24)
**Impact:** Lead wanting "pool + gym" can't match on amenities.
**Fix:** Include amenities in the propertyList mapping.

### 21. CSV export ignores current filters
**File:** `src/app/api/leads/export/route.ts`
**Impact:** Exporting after filtering still dumps all leads.
**Fix:** Pass current filter params to export API.

### 22. Tier counts not filter-aware
**File:** `src/app/api/leads/route.ts` (line 61)
**Impact:** Tier badges show global counts even when filtering by platform/search.
**Fix:** Apply same filters to tierCounts query, or label as "total."

### 23. No brochure download link on property detail
**File:** `src/app/(dashboard)/properties/[id]/page.tsx`
**Impact:** `brochureUrl` stored but not linked. Broker can't re-access uploaded brochure.
**Fix:** Add "View Brochure" button linking to `brochureUrl`.

### 24. No geographic heatmap for Market Intel
**File:** `src/app/(dashboard)/market/page.tsx`
**Impact:** All hotness data exists but no map visualization.
**Fix:** Add Leaflet/Mapbox map with color-coded area markers.

### 25. Facebook fallback ignores groupId
**File:** `src/lib/scraping/platforms/facebook.ts` (line 69)
**Impact:** Firecrawl fallback doesn't include the group identifier in query.
**Fix:** Include groupId in Firecrawl search query.

### 26. RunGroup status never completed
**File:** `src/lib/scraping/run-group.ts`
**Impact:** `completeRunGroup()` exists but is never called. RunGroup stays "RUNNING" forever.
**Fix:** Call `completeRunGroup()` after all sources finish.

### 27. Batch scoring limited to 5 per click
**Files:** `src/lib/scraping/engine.ts`, `src/app/api/leads/score-all/route.ts`
**Impact:** 200 leads = 40 clicks to score all.
**Fix:** Increase batch size or add auto-continuation.

### 28. No opt-out mechanism
**Files:** `src/lib/outreach/compliance.ts`
**Impact:** No unsubscribe links in emails, no STOP keyword handling.
**Fix:** Add unsubscribe link to email template, implement opt-out webhook.

### 29. Template variables not substituted on send
**Files:** `src/app/api/outreach/email/route.ts`, `whatsapp/route.ts`
**Impact:** Templates with {{name}} variables aren't auto-filled with lead data.
**Fix:** Add template rendering step that substitutes variables.

### 30. No pagination on properties list
**File:** `src/app/(dashboard)/properties/page.tsx`
**Impact:** All properties loaded at once. Slow for brokers with many listings.
**Fix:** Add take/skip pagination.

### 31. No duplicate property detection
**File:** `src/app/api/properties/route.ts`
**Impact:** Same brochure uploaded twice creates duplicates.
**Fix:** Check for existing property with same RERA number or name+area.

### 32. Deleted sources re-created on next load
**File:** `src/app/api/scraping/sources/route.ts` (line 50-63)
**Impact:** Broker deletes a source, it reappears on page refresh.
**Fix:** Track which sources were explicitly deleted (flag or separate table).

### 33. No sort by budget on leads list
**File:** `src/app/(dashboard)/leads/page.tsx`
**Impact:** Can't prioritize high-budget leads.
**Fix:** Add `budget_desc` sort option.

### 34. Campaign builder placeholder only
**File:** `src/app/(dashboard)/outreach/page.tsx`
**Impact:** "Coming soon" text. No multi-step outreach automation.
**Fix:** Implement or remove from UI to avoid confusion.

### 35. No Hyderabad area names in coach system prompt
**File:** `src/lib/ai/conversation-coach.ts`
**Impact:** Generic "tech parks" instead of specific area names for contextual coaching.
**Fix:** Add top 15 Hyderabad area names to system prompt.

---

## P3 -- LOW (Backlog) -- 20 issues

### 36. No skeleton loaders (spinner only)
### 37. Source chart XAxis label overlap with 13 platforms
### 38. Preview missing possession date field
### 39. Preview missing description field
### 40. Unit type null price guard missing in detail page
### 41. Property type not detected from AI extraction
### 42. No soft-delete for properties
### 43. No image gallery for properties
### 44. LinkedIn authorId set to post URL (should be profile URL)
### 45. NoBroker coordinates hardcoded to Hyderabad
### 46. Google Maps city hardcoded
### 47. YouTube search query has duplicate "hyderabad"
### 48. Reddit author "unknown" for Firecrawl results
### 49. CommonFloor platform likely dead (acquired by Quikr/Housing)
### 50. No default Telegram/CommonFloor sources seeded
### 51. No platform-specific help text for identifier field
### 52. Error messages are developer-oriented (e.g., "FIRECRAWL_API_KEY")
### 53. Tier platform config duplicated between UI and backend
### 54. Text truncation at 2000 chars in fast intent detection
### 55. Tour text says IT Pro budget "50L-1.5Cr" but constants say "60L-1.5Cr"

---

## Issue Distribution

| Severity | Count | % |
|----------|-------|---|
| P0 Critical | 5 | 9% |
| P1 High | 12 | 22% |
| P2 Medium | 18 | 33% |
| P3 Low | 20 | 36% |
| **Total** | **55** | 100% |

| Category | Count |
|----------|-------|
| Missing Feature | 22 |
| Data Quality | 10 |
| UX/UI | 12 |
| Bug/Crash | 3 |
| AI Quality | 8 |
