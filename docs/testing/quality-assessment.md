# PropLeads AI -- AI Output Quality Assessment

**Date:** 2026-03-14
**Context:** Hyderabad luxury real estate broker, Nanakramguda/Financial District corridor

---

## 1. Brochure Extraction (Claude Sonnet)

**Rating: 7/10**

**What it does well:**
- Extracts project name, builder, RERA number accurately
- Identifies unit types with sqft ranges
- Pulls amenities and USPs from brochure text
- Handles the Arka brochure format (a "lite" version with limited data)

**What's missing:**
- **No propertyType detection** -- Always defaults to APARTMENT even for villas/plots
- **Preview is read-only** -- Broker can't fix extraction errors before saving
- **Possession date not shown in preview** -- Extracted but hidden
- **Description not stored** -- Extracted by AI but no DB column exists
- **No image extraction** -- Brochure images/floor plans not captured
- For the Arka Lite brochure specifically: no prices in the PDF means price fields are empty (correct behavior), but the broker gets no guidance on "we couldn't find prices -- please add them manually"

**Hyderabad context:** Not specifically needed for extraction (brochure is self-contained). Score reflects general extraction quality.

---

## 2. Intent Detection (Claude Haiku -- Fast Mode)

**Rating: 8/10**

**What it does well:**
- Platform-specific prompts (Reddit vs Facebook vs 99acres vs Google Maps reviews)
- Extracts: isPropertySeeker, confidence, budget (min/max/raw), areas, propertyType, timeline, persona, intentSignals (vastu/nri/wfh/investment)
- Budget parsing handles Indian formats (lakhs, crores, "60-80L", "1.5Cr")
- Confidence threshold (0.5) filters out low-quality matches
- Hyderabad areas listed in prompt (20 in fast mode)

**What's missing:**
- **17 Hyderabad areas missing from fast mode** -- Nallagandla, Gopanpally, Chandanagar, Attapur, Gandipet, Nizampet, Shadnagar, Dundigal, Rajendra Nagar, Appa Junction, Tolichowki, Begumpet, Ameerpet, Lingampally, Pragathi Nagar, Mehdipatnam, Patancheru. Posts mentioning these won't get area detection.
- **Text truncated at 2000 chars** -- Long forum posts may lose important details at the end
- **Portal listings fundamentally mismatched** -- Intent detection on 99acres/MagicBricks tries to find "buyer requirements" in what are mostly seller listings. Results in very low hit rates.
- **No area proximity understanding** -- "Financial District" won't map to "Nanakramguda" even though they're the same area

**Example scenario:** A Reddit post: "Looking for 3BHK apartment in Nanakramguda/Gachibowli area, budget 1.2Cr, prefer Vastu-compliant, IT professional working at Qualcomm"
- Expected: isPropertySeeker=true, budget=1.2Cr, areas=[Nanakramguda, Gachibowli], persona=IT_PROFESSIONAL, vastu=true
- Actual (predicted): All correct except the fast mode prompt has both Nanakramguda AND Gachibowli in its area list (20 areas), so this specific case works. But "Nallagandla" would NOT be detected.

---

## 3. Lead Scoring (Claude Sonnet)

**Rating: 7/10**

**What it does well:**
- 6-factor breakdown is transparent and explainable (budget 25, location 20, timeline 15, engagement 15, profile 15, social 10)
- Hyderabad market context ("Score this lead for Hyderabad market")
- Considers buyer persona alignment
- Uses the broker's actual property areas (dynamic, not hardcoded)
- HOT/WARM/COLD thresholds are industry-standard

**What's missing:**
- **Property price ranges NOT passed to prompt** -- The AI is asked "how well budget aligns with our property price range" but never told what that range IS. For a Nanakramguda broker with 1.2Cr-2.8Cr properties, a lead with 50L budget should score low on budget factor -- but the AI doesn't know the broker's price range. Only area names are provided.
- **No manual override** -- Broker can't adjust scores based on personal knowledge
- **Batch limited to 5** -- 200 scraped leads = 40 clicks
- **No scoring explanation visible in list** -- Must click into detail page to see breakdown

**Example scenario:** Lead with "budget 50L, looking in Gachibowli" for a broker selling 1.2Cr+ properties:
- Expected budget score: Low (2-5/25) -- severe budget mismatch
- Actual (predicted): AI may score budget higher because it only knows "our properties are in Gachibowli" but not the price range. Could give 12-15/25 thinking Gachibowli has a wide price range.

---

## 4. Property Matching (Claude Sonnet)

**Rating: 8/10**

**What it does well:**
- Budget overlap comparison (lead budget vs property price range, both in lakhs)
- Area matching with AI's geographic knowledge
- Persona-to-property alignment (IT Pro -> Financial District properties)
- USPs included for personalized match summaries
- Intent signals (Vastu, NRI, WFH) enhance matching
- Top 3 matches with scores, reasons array, and narrative summary
- Match reasons as badges (budget_fit, area_match, persona_fit)

**What's missing:**
- **Amenities dropped from prompt** -- Function signature accepts amenities but they're never included in the AI prompt. A lead wanting "swimming pool + gym" can't match on amenities.
- **No area proximity data** -- AI must infer that Nanakramguda borders Gachibowli using world knowledge. Not deterministic.
- **Unit type alignment missing** -- A lead wanting "4BHK" should prefer properties with 4BHK units. Unit types are passed but not explicitly called out in the matching prompt.

**Example scenario:** Lead: "NRI, budget 2Cr, looking for 4BHK in Financial District, wants Vastu + clubhouse"
- Property: Arka (Nanakramguda, 2120-4410 sqft, near Financial District)
- Expected: High match (85+), reasons: [budget_fit, area_match, persona_fit], summary mentioning proximity to IT corridor
- Actual (predicted): Likely correct match with good summary. Claude knows Nanakramguda is in the Financial District corridor. The Vastu signal would be caught but clubhouse (an amenity) would NOT be matched because amenities are dropped.

---

## 5. Conversation Coach (Claude Sonnet)

**Rating: 6/10**

**What it does well:**
- Hyderabad-specific system prompt is excellent: Vastu compliance, Telugu rapport, NRI needs (virtual visits, POA, rental yield, RERA), IT professional preferences, 2BHK-to-3BHK upgrade trend
- 6-point analysis framework (strengths, missed opps, suggested message, objections, next steps, score)
- Message generator: 6 personas x 3 channels x 6 stages = 108 message combinations
- Channel-aware formatting (WhatsApp <200 words, SMS <160 chars, Email with subject)
- Playbook generation (7-item sales playbook) -- but no UI

**What's critically missing:**
- **Lead data NOT injected into prompt** -- The analyze endpoint fetches the lead for authorization but DISCARDS all lead data (score, budget, areas, persona, intent signals). The AI analyzes the conversation without knowing WHO this lead is. This is the biggest quality issue across the entire platform.
- **Property data NOT available** -- The AI doesn't know the broker's inventory. Can't recommend "mention Arka's clubhouse" or "compare with Prestige High Fields pricing."
- **No specific Hyderabad area names** -- System prompt says "proximity to tech parks" generically but doesn't mention Gachibowli, HITEC City, Financial District, Kokapet, etc.
- **Playbook generation has no UI** -- Excellent API feature completely invisible to brokers.

**Example scenario:** Broker pastes WhatsApp chat where buyer asks about Arka project pricing:
```
Buyer: Hi, I saw Arka project in Nanakramguda. What's the price for 3BHK?
Broker: Sir, prices start from 1.5Cr for 3BHK.
Buyer: That's over my budget. I was thinking around 1Cr.
```
- Expected AI coaching: "The buyer has budget constraints. Suggest the 2BHK option (smaller unit in same project), or mention EMI options, or redirect to a more affordable property in your portfolio."
- Actual (predicted): AI would give generic objection handling about price concerns. It CANNOT suggest the 2BHK option because it doesn't know Arka's unit types. It CANNOT suggest alternative properties because it doesn't know the broker's inventory. The coaching is generic, not contextual.

**This is the single biggest quality gap in the platform.**

---

## 6. Message Generation (Claude Sonnet)

**Rating: 7/10**

**What it does well:**
- 6 buyer personas with distinct communication styles
- 3 channels with format constraints
- 6 sales stages from first contact to closing
- Hyderabad cultural context in system prompt
- Copy-to-clipboard for easy use

**What's missing:**
- **No actual lead data** -- Messages are generated from generic persona + channel + stage. The broker must manually type the property name and any lead-specific details.
- **No property database access** -- Can't auto-fill property USPs, prices, RERA numbers
- **No template variable substitution** -- Generated messages and saved templates are disconnected systems
- **No send-from-here** -- Must copy message and paste into WhatsApp/email manually

**Example:** Generate WhatsApp first-contact for IT Professional about Arka:
- Expected: Personalized message mentioning specific Arka details (43 floors, Nanakramguda location, RERA number, proximity to IT corridor)
- Actual: Generic luxury apartment message. Broker must manually type "Arka" in the property name field, and the AI will use that text string but won't know any details about Arka.

---

## Summary: AI Quality Ratings

| Feature | Rating | Key Strength | Key Gap |
|---------|--------|-------------|---------|
| Brochure Extraction | 7/10 | Accurate structured extraction | No property type detection, read-only preview |
| Intent Detection | 8/10 | Platform-specific, good budget parsing | 17 missing areas in fast mode |
| Lead Scoring | 7/10 | Transparent 6-factor breakdown | Property price ranges not in prompt |
| Property Matching | 8/10 | Budget+area+persona+USPs | Amenities dropped from prompt |
| Conversation Coach | 6/10 | Excellent Hyderabad cultural prompt | Lead and property data not injected |
| Message Generation | 7/10 | Good persona x channel x stage matrix | No actual lead/property context |

**Overall AI Quality: 7.2/10**

**The #1 improvement:** Inject lead data (score, budget, areas, persona) AND the broker's property inventory into the AI Coach and Message Generator prompts. This single change would raise the coach from 6/10 to 8-9/10 and the message generator from 7/10 to 9/10.
