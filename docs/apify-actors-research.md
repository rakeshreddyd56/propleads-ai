# Apify Actors Research: Indian Real Estate Lead Discovery (Hyderabad Focus)

> Research Date: 2026-03-12
> All actor IDs verified from Apify Store search results.

---

## Table of Contents
1. [99acres Scrapers](#1-99acres-scrapers)
2. [MagicBricks Scrapers](#2-magicbricks-scrapers)
3. [NoBroker Scrapers](#3-nobroker-scrapers)
4. [Facebook Group Scrapers](#4-facebook-group-scrapers)
5. [Instagram Scrapers](#5-instagram-scrapers)
6. [Twitter/X Scrapers](#6-twitterx-scrapers)
7. [YouTube Comments Scrapers](#7-youtube-comments-scrapers)
8. [LinkedIn Scrapers](#8-linkedin-scrapers)
9. [Google Maps Scrapers](#9-google-maps-scrapers)
10. [Quora Scrapers](#10-quora-scrapers)
11. [Telegram Scrapers](#11-telegram-scrapers)
12. [Apify REST API Reference](#12-apify-rest-api-reference)

---

## 1. 99acres Scrapers

### Option A: `easyapi/99acres-com-scraper`
- **URL**: https://apify.com/easyapi/99acres-com-scraper
- **Pricing**: Compute-unit based (platform CU pricing, no separate per-result fee listed)
- **Modes**: URL Mode (pass search result URLs) and Location Mode (pass city/locality names)

**Input Schema**:
```json
{
  "mode": "url",
  "startUrls": [
    { "url": "https://www.99acres.com/search/property/buy/hyderabad?city=21&preference=S&area_unit=1&res_com=R" }
  ],
  "locations": ["Hyderabad", "Gachibowli, Hyderabad"],
  "maxItems": 100,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"]
  }
}
```

**Output Fields**:
- `id` / `SPID` / `propId` - Unique property identifiers
- `title` - Listing title
- `propertyType` - Apartment, Villa, Plot, etc.
- `bedrooms`, `bathrooms`, `balconies`
- `price` - Listed price
- `areaType` - Carpet Area / Built-up Area / Super Built-up
- `floorSize` - e.g. "750 sq.ft."
- `locality`, `city`, `state`
- `url` - Direct link to listing
- `dealerName`, `dealerContact` - Agent/dealer info
- `description`, `amenities`, `images`

**Limitations**: Residential proxies strongly recommended. Anti-bot detection on 99acres.

---

### Option B: `fatihtahta/99acres-scraper`
- **URL**: https://apify.com/fatihtahta/99acres-scraper
- **Pricing**: **$17/month** (subscription) or use `fatihtahta/99acres-scraper-ppe` at **$5 per 1,000 results**

**Input Schema**:
```json
{
  "startUrls": [
    { "url": "https://www.99acres.com/property-in-hyderabad-ffid" }
  ],
  "locations": ["Hyderabad"],
  "propertyType": "buy",
  "maxItems": 200,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"]
  }
}
```

**Output**: Same field structure as Option A.

---

### Option C: `stealth_mode/99acres-property-search-scraper`
- **URL**: https://apify.com/stealth_mode/99acres-property-search-scraper
- **Pricing**: Compute-unit based

---

## 2. MagicBricks Scrapers

### `ecomscrape/magicbricks-property-search-scraper`
- **URL**: https://apify.com/ecomscrape/magicbricks-property-search-scraper
- **Pricing**: Compute-unit based (no separate per-result fee listed)

**Input Schema**:
```json
{
  "startUrls": [
    { "url": "https://www.magicbricks.com/property-for-sale/residential-real-estate?bedroom=2,3&proptype=Multistorey-Apartment,Builder-Floor-Apartment,Penthouse,Studio-Apartment&cityName=Hyderabad" }
  ],
  "maxItemsPerUrl": 30,
  "maxRetriesPerUrl": 2,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"]
  }
}
```

**Output Fields**:
- Property name, address, locality
- Price, BHK configuration
- Area (sq.ft.), floor details
- Property type, project name
- Builder/agent info
- Images, amenities
- Listing URL

**Limitations**: Residential proxies required (use SG/IN proxy groups). Max ~30 items per URL for reliability.

### Also available: `ecomscrape/magicbricks-property-details-page-scraper`
- **URL**: https://apify.com/ecomscrape/magicbricks-property-details-page-scraper
- For scraping individual property detail pages (pass individual listing URLs)

---

## 3. NoBroker Scrapers

### `ecomscrape/nobroker-property-search-scraper`
- **URL**: https://apify.com/ecomscrape/nobroker-property-search-scraper
- **Pricing**: Compute-unit based

**Input Schema**:
```json
{
  "startUrls": [
    { "url": "https://www.nobroker.in/property/sale/hyderabad/Gachibowli?searchParam=W3sibGF0IjoxNy40NDAwLCJsb24iOjc4LjM0ODksInBsYWNlSWQiOiJDaElKbC1CZDE0bVlZam9SdnEyNDVTZ3JMbTgiLCJwbGFjZU5hbWUiOiJHYWNoaWJvd2xpIn1d&orderBy=relevance&propertyType=BHK2" }
  ],
  "maxItemsPerUrl": 30,
  "maxRetriesPerUrl": 2,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"]
  }
}
```

**Output Fields**:
- `propertyId`, `title`
- `price`, `propertySize`
- `state`, `city`, `address`
- `nbLocality`, `society`
- `latitude`, `longitude` (coordinates for mapping)
- `project_url`, `original_image_url`
- Features, amenities

**Limitations**: NoBroker has strong anti-bot protection. Limit to 30 items/URL for reliability. Create multiple URLs for different price ranges/localities.

### Also available: `ecomscrape/nobroker-property-details-page-scraper`
- For individual property detail pages

---

## 4. Facebook Group Scrapers

### Option A (No Login): `data-slayer/facebook-group-posts`
- **URL**: https://apify.com/data-slayer/facebook-group-posts
- **Pricing**: Compute-unit based
- **Login Required**: NO - works without cookies or login

**Input Schema**:
```json
{
  "groupId": "123456789",
  "maxPosts": 100
}
```
> Get `groupId` from the group's URL (numeric ID)

**Output Fields**:
- Post text/content
- Author name
- Timestamp
- Likes, comments count, shares
- Post URL
- Media attachments

**Limitations**: Only works with **public** groups. Cannot scrape private/closed groups.

---

### Option B (Official): `apify/facebook-groups-scraper`
- **URL**: https://apify.com/apify/facebook-groups-scraper
- **Pricing**: ~**$5 per 1,000 posts** ($0.005/post)
- **Login Required**: Requires cookies for non-public content

**Input Schema**:
```json
{
  "startUrls": [
    { "url": "https://www.facebook.com/groups/hyderabadrealestate/" }
  ],
  "maxPosts": 200,
  "maxComments": 50
}
```

**Output Fields**:
- `postUrl`, `postId`
- `text` (post content)
- `authorName`, `authorId`
- `timestamp`
- `likesCount`, `commentsCount`, `sharesCount`
- `topReactions` (breakdown by type)
- `topComments[]` (nested comment data)
- Media URLs

**Limitations**: Public groups only (without cookies). Private groups need Facebook cookies.

---

### Option C: `curious_coder/facebook-post-scraper`
- **URL**: https://apify.com/curious_coder/facebook-post-scraper
- Scrapes posts from Groups, Pages, and Search results

---

## 5. Instagram Scrapers

### Option A (All-in-One): `apify/instagram-scraper`
- **URL**: https://apify.com/apify/instagram-scraper
- **Pricing**: **$2.30 per 1,000 results** ($0.0023/result)

**Input Schema**:
```json
{
  "directUrls": [
    "https://www.instagram.com/explore/tags/hyderabadrealestate/",
    "https://www.instagram.com/hyderabad_properties/"
  ],
  "resultsType": "posts",
  "resultsLimit": 200,
  "searchType": "hashtag",
  "searchLimit": 10
}
```
`resultsType` options: `"posts"`, `"comments"`, `"details"`

**Output Fields**:
- `id`, `shortCode`, `url`
- `caption` (post text)
- `commentsCount`, `likesCount`
- `timestamp`, `ownerUsername`
- `images[]`, `videoUrl`
- `mentions[]`, `hashtags[]`
- `coauthors[]`
- `isSponsored`, `videoDuration`, `videoViewCount`

---

### Option B (Posts Only): `apify/instagram-post-scraper`
- **URL**: https://apify.com/apify/instagram-post-scraper
- **Pricing**: **$2.70 per 1,000 results**

---

### Option C (Hashtags): `apify/instagram-hashtag-scraper`
- **URL**: https://apify.com/apify/instagram-hashtag-scraper
- Specifically for hashtag exploration

---

### Option D (Comments): `apidojo/instagram-comments-scraper`
- **URL**: https://apify.com/apidojo/instagram-comments-scraper
- **Pricing**: **$0.50 per 1,000 comments**
- Speed: 100-200 comments/second

---

## 6. Twitter/X Scrapers

### Option A (Recommended): `apidojo/tweet-scraper`
- **URL**: https://apify.com/apidojo/tweet-scraper
- **Pricing**: **$0.40 per 1,000 tweets**
- Speed: 30-80 tweets/second

**Input Schema**:
```json
{
  "searchTerms": [
    "hyderabad real estate",
    "hyderabad property sale",
    "hyderabad flat for sale",
    "gachibowli apartment"
  ],
  "maxItems": 500,
  "tweetLanguage": "en",
  "onlyVerifiedUsers": false,
  "onlyImage": false,
  "onlyVideo": false,
  "onlyQuote": false
}
```
> Supports Twitter Advanced Search syntax (same as twitter.com/search)

**Output Fields**:
- `id`, `text`, `url`
- `createdAt` (timestamp)
- `author` (username, displayName, followersCount, verified)
- `likeCount`, `retweetCount`, `replyCount`, `viewCount`
- `media[]` (images/videos)
- `hashtags[]`, `mentions[]`
- `isRetweet`, `isQuote`

---

### Option B (Cheaper): `apidojo/twitter-scraper-lite`
- **URL**: https://apify.com/apidojo/twitter-scraper-lite
- **Pricing**: **$0.20-0.30 per 1,000 tweets**

---

### Option C (Advanced Search): `altimis/scweet`
- **URL**: https://apify.com/altimis/scweet
- Rich filtering: `all_words`, `any_words`, `exact_phrases`, `exclude_words`, `hashtags_any`, `from_users`, `to_users`, `mentioning_users`, `has_images`, `has_videos`, `has_links`, `tweet_type`, `verified_only`

---

## 7. YouTube Comments Scrapers

### `streamers/youtube-comments-scraper`
- **URL**: https://apify.com/streamers/youtube-comments-scraper
- **Pricing**: **$0.50 per 1,000 comments**
- **No YouTube API key required**

**Input Schema**:
```json
{
  "startUrls": [
    { "url": "https://www.youtube.com/watch?v=VIDEO_ID_1" },
    { "url": "https://www.youtube.com/watch?v=VIDEO_ID_2" }
  ],
  "maxComments": 500,
  "includeReplies": true
}
```
> Also accepts CSV/Google Sheet imports for bulk URLs

**Output Fields**:
- `text` - Full comment text
- `author` - Commenter username
- `authorIsChannelOwner` - Boolean
- `hasCreatorHeart` - Boolean (creator liked)
- `voteCount` - Number of likes on comment
- `replyCount` - Number of replies
- `publishedAt` - Timestamp
- `videoTitle`, `videoId`
- `channelName`

**Limitations**: Requires residential proxies (included in Apify Starter plan).

---

### Alternative: `memo23/youtube-comments-scraper`
- **URL**: https://apify.com/memo23/youtube-comments-scraper
- **Pricing**: **$0.50 per 1,000 comments** (with replies)

---

## 8. LinkedIn Scrapers

### Posts Search: `harvestapi/linkedin-post-search`
- **URL**: https://apify.com/harvestapi/linkedin-post-search
- **Pricing**: Pay-per-event (HarvestAPI model)
- **Cookies Required**: NO

**Input Schema**:
```json
{
  "searchUrls": [
    "https://www.linkedin.com/search/results/content/?keywords=hyderabad%20real%20estate"
  ],
  "maxItems": 100
}
```

**Limitations**: LinkedIn limits to ~400 posts per search query.

---

### Post Comments: `harvestapi/linkedin-post-comments`
- **URL**: https://apify.com/harvestapi/linkedin-post-comments
- **Pricing**: **$2 per 1,000 comments**
- **Cookies Required**: NO

**Input Schema**:
```json
{
  "postUrls": [
    "https://www.linkedin.com/feed/update/urn:li:activity:XXXXX"
  ],
  "maxItems": 100
}
```

**Output Fields**:
- Comment text, author name/profile
- Timestamp
- Likes/reactions on comment
- Up to 5 nested replies per comment

---

### Profile Posts: `harvestapi/linkedin-profile-posts`
- **URL**: https://apify.com/harvestapi/linkedin-profile-posts
- **Pricing**: **$2 per 1,000 posts**
- **Cookies Required**: NO

---

### Individual Posts: `supreme_coder/linkedin-post`
- **URL**: https://apify.com/supreme_coder/linkedin-post
- **Pricing**: **$1 per 1,000 posts**
- **Cookies Required**: NO

---

## 9. Google Maps Scrapers

### Option A (Full Featured): `compass/crawler-google-places`
- **URL**: https://apify.com/compass/crawler-google-places
- **Pricing**: **$4.00 per 1,000 results**

**Input Schema**:
```json
{
  "searchStringsArray": [
    "real estate agents in Hyderabad",
    "property dealers Hyderabad",
    "builders Gachibowli Hyderabad",
    "flat for sale Hyderabad"
  ],
  "maxCrawledPlacesPerSearch": 100,
  "language": "en",
  "maxReviews": 50,
  "reviewsSort": "newest",
  "scrapeReviewerName": true,
  "scrapeReviewerId": true,
  "scrapeReviewerUrl": true,
  "scrapeReviewId": true,
  "scrapeReviewUrl": true,
  "scrapeResponseFromOwnerText": true,
  "oneReviewPerRow": false,
  "reviewsTranslation": "originalAndTranslated"
}
```

**Output Fields**:
- `title` - Business name
- `categoryName` - e.g. "Real estate agent"
- `address`, `city`, `state`, `postalCode`
- `phone`, `website`
- `totalScore` (rating), `reviewsCount`
- `latitude`, `longitude`
- `openingHours[]`
- `imageUrls[]`
- `reviews[]` (nested: author, text, rating, timestamp, response)
- `plusCode`, `shareLink`
- Additional 50+ fields

---

### Reviews Only: `compass/google-maps-reviews-scraper`
- **URL**: https://apify.com/compass/google-maps-reviews-scraper
- For deep review extraction from specific places

**Input Schema**:
```json
{
  "placeUrls": [
    "https://www.google.com/maps/place/..."
  ],
  "maxReviews": 500,
  "reviewsSort": "newest",
  "reviewsStartDate": "2025-01-01"
}
```

`reviewsSort` options: `"newest"`, `"mostRelevant"`, `"highestRanking"`, `"lowestRanking"`

---

## 10. Quora Scrapers

### `memo23/quora-scraper-with-optional-login`
- **URL**: https://apify.com/memo23/quora-scraper-with-optional-login
- **Pricing**: Compute-unit based

**Input Schema**:
```json
{
  "startUrls": [
    { "url": "https://www.quora.com/search?q=buying+property+in+hyderabad" },
    { "url": "https://www.quora.com/What-are-the-best-areas-to-buy-a-flat-in-Hyderabad" }
  ],
  "maxItems": 100,
  "cookies": [
    { "name": "m-b", "value": "YOUR_COOKIE_VALUE" },
    { "name": "m-lat", "value": "YOUR_COOKIE_VALUE" }
  ],
  "proxy": {
    "useApifyProxy": true
  }
}
```

**Output Fields**:
- Question title, question URL
- Question creation time
- Answer count
- Full answer text/content
- Answer author info
- Upvotes, views

**Limitations**: **Cookies REQUIRED** - Quora blocks unauthenticated scraping.
- Login to quora.com
- Export cookies via browser extension (e.g. EditThisCookie)
- Pass `m-b` and `m-lat` cookie values in input

---

### Alternative (No Cookies): `jupri/quora-scraper`
- **URL**: https://apify.com/jupri/quora-scraper
- May work without cookies for some public pages

### Alternative (No Cookies): `fatihtahta/quora-scraper`
- **URL**: https://apify.com/fatihtahta/quora-scraper
- **Pricing**: **$5 per 1,000 results**
- Advertises no cookies needed

---

## 11. Telegram Scrapers

### Option A: `sovereigntaylor/telegram-scraper`
- **URL**: https://apify.com/sovereigntaylor/telegram-scraper
- **Pricing**: **$0.003 per message** ($3 per 1,000 messages). Channel metadata extraction is free.
- **No API key required** - Uses public preview page (`t.me/s/channelname`)

**Input Schema**:
```json
{
  "channels": ["hyderabad_real_estate", "hyderabad_properties"],
  "maxMessages": 500
}
```
> Uses `t.me/s/channelname` (server-rendered HTML) with `?before=` pagination

**Output Fields**:
- Message text
- Views count, forwards count
- Media attachments (images, videos, documents)
- Reactions
- Timestamps
- Channel metadata (name, bio, subscriber count)

**Limitations**: Public channels only. No private groups without Telegram API auth.

---

### Option B: `dainty_screw/telegram-scraper`
- **URL**: https://apify.com/dainty_screw/telegram-scraper
- **Pricing**: Compute-unit based

**Input Schema**:
```json
{
  "channels": ["channelUsername"],
  "rangeStrategy": "id",
  "idFrom": 1,
  "idTo": 1000,
  "maxPostsPerChannel": 500,
  "includeComments": true,
  "maxCommentsPerPost": 20
}
```

Supports: Post ID ranges, date ranges, configurable post limits, optional comment harvesting, reactions, and attachments.

---

### Option C (API-based): `bhansalisoft/telegram-group-channel-message-scraper`
- **URL**: https://apify.com/bhansalisoft/telegram-group-channel-message-scraper
- Requires Telegram Auth Token (QR code authentication)
- Can access private groups/channels

---

## 12. Apify REST API Reference

### Authentication
```
Authorization: Bearer <YOUR_APIFY_API_TOKEN>
```
Get your token from: Apify Console > Settings > Integrations

---

### Method 1: Run Actor Synchronously (for runs < 5 minutes)

**Endpoint**: Run actor and get dataset items in one call
```
POST https://api.apify.com/v2/acts/{actorId}/run-sync-get-dataset-items
```

**cURL Example**:
```bash
curl -X POST \
  "https://api.apify.com/v2/acts/easyapi~99acres-com-scraper/run-sync-get-dataset-items?format=json&clean=true" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startUrls": [
      { "url": "https://www.99acres.com/search/property/buy/hyderabad?city=21" }
    ],
    "maxItems": 50,
    "proxyConfiguration": {
      "useApifyProxy": true,
      "apifyProxyGroups": ["RESIDENTIAL"]
    }
  }'
```

**Query Parameters**:
- `format` - `json` | `jsonl` | `csv` | `xlsx` | `xml` | `html` | `rss` (default: `json`)
- `clean` - `true` removes empty items and hidden fields (fields starting with `#`)
- `limit` - Max items to return
- `offset` - Skip N items
- `fields` - Comma-separated list of fields to include

**Note**: Actor ID format uses `~` instead of `/` in URLs: `easyapi/99acres-com-scraper` becomes `easyapi~99acres-com-scraper`

---

### Method 2: Run Actor Asynchronously (for runs > 5 minutes)

**Step 1: Start the run**
```bash
curl -X POST \
  "https://api.apify.com/v2/acts/easyapi~99acres-com-scraper/runs" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startUrls": [{ "url": "..." }],
    "maxItems": 500
  }'
```

**Response** (save `id` and `defaultDatasetId`):
```json
{
  "data": {
    "id": "RUN_ID",
    "status": "RUNNING",
    "defaultDatasetId": "DATASET_ID",
    ...
  }
}
```

**Step 2: Poll for completion**
```bash
curl "https://api.apify.com/v2/acts/easyapi~99acres-com-scraper/runs/RUN_ID" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```
Check `data.status` - wait for `"SUCCEEDED"` or `"FAILED"`.

Or use `waitForFinish` parameter (max 60 seconds per call):
```bash
curl "https://api.apify.com/v2/acts/easyapi~99acres-com-scraper/runs/RUN_ID?waitForFinish=60" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

**Step 3: Get dataset items**
```bash
curl "https://api.apify.com/v2/datasets/DATASET_ID/items?format=json&clean=true" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

---

### Method 3: Webhooks (Best for Production)

Set up a webhook on the actor/task to receive a POST request when the run finishes:
```bash
curl -X POST \
  "https://api.apify.com/v2/webhooks" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventTypes": ["ACTOR.RUN.SUCCEEDED"],
    "requestUrl": "https://your-server.com/api/apify-webhook",
    "actorId": "easyapi/99acres-com-scraper"
  }'
```

---

### JavaScript/Node.js Client
```javascript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: 'YOUR_API_TOKEN' });

// Run actor and wait for results
const run = await client.actor('easyapi/99acres-com-scraper').call({
  startUrls: [{ url: 'https://www.99acres.com/search/property/buy/hyderabad' }],
  maxItems: 100,
  proxyConfiguration: {
    useApifyProxy: true,
    apifyProxyGroups: ['RESIDENTIAL'],
  },
});

// Get results from dataset
const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(items);
```

---

## Pricing Summary Table

| Actor | Actor ID | Pricing | Notes |
|-------|----------|---------|-------|
| 99acres (EasyAPI) | `easyapi/99acres-com-scraper` | Platform CU-based | Compute units |
| 99acres (FatihTahta) | `fatihtahta/99acres-scraper` | **$17/month** | Subscription |
| 99acres (PPE) | `fatihtahta/99acres-scraper-ppe` | **$5/1k results** | Pay per event |
| MagicBricks | `ecomscrape/magicbricks-property-search-scraper` | Platform CU-based | Compute units |
| NoBroker | `ecomscrape/nobroker-property-search-scraper` | Platform CU-based | Compute units |
| Facebook Groups | `apify/facebook-groups-scraper` | **$5/1k posts** | Public groups only |
| Facebook (No Login) | `data-slayer/facebook-group-posts` | Platform CU-based | No login needed |
| Instagram (All-in-One) | `apify/instagram-scraper` | **$2.30/1k results** | Posts + comments |
| Instagram Posts | `apify/instagram-post-scraper` | **$2.70/1k results** | Posts only |
| Instagram Comments | `apidojo/instagram-comments-scraper` | **$0.50/1k comments** | Fast |
| Twitter/X | `apidojo/tweet-scraper` | **$0.40/1k tweets** | Advanced search |
| Twitter/X Lite | `apidojo/twitter-scraper-lite` | **$0.20-0.30/1k** | Cheapest |
| YouTube Comments | `streamers/youtube-comments-scraper` | **$0.50/1k comments** | No API key |
| LinkedIn Posts Search | `harvestapi/linkedin-post-search` | Pay-per-event | No cookies |
| LinkedIn Post Comments | `harvestapi/linkedin-post-comments` | **$2/1k comments** | No cookies |
| LinkedIn Posts | `supreme_coder/linkedin-post` | **$1/1k posts** | No cookies |
| Google Maps | `compass/crawler-google-places` | **$4/1k places** | 50+ fields |
| Google Maps Reviews | `compass/google-maps-reviews-scraper` | Platform CU-based | Deep reviews |
| Quora | `memo23/quora-scraper-with-optional-login` | Platform CU-based | Cookies needed |
| Quora (No Cookies) | `fatihtahta/quora-scraper` | **$5/1k results** | No cookies |
| Telegram | `sovereigntaylor/telegram-scraper` | **$3/1k messages** | No API key |
| Telegram (Advanced) | `dainty_screw/telegram-scraper` | Platform CU-based | Date ranges |

---

## Recommended Actors for Hyderabad Real Estate Leads

### Tier 1 - Direct Property Portals (Highest Value)
1. **`fatihtahta/99acres-scraper-ppe`** - Best 99acres option ($5/1k, pay-per-event)
2. **`ecomscrape/magicbricks-property-search-scraper`** - Only viable MagicBricks option
3. **`ecomscrape/nobroker-property-search-scraper`** - Only viable NoBroker option

### Tier 2 - Social Media Lead Discovery
4. **`apidojo/tweet-scraper`** - Search "hyderabad property" tweets ($0.40/1k)
5. **`apify/instagram-scraper`** - #hyderabadrealestate hashtags ($2.30/1k)
6. **`apify/facebook-groups-scraper`** - Hyderabad real estate groups ($5/1k)
7. **`supreme_coder/linkedin-post`** - LinkedIn real estate posts ($1/1k)

### Tier 3 - Reviews & Intent Signals
8. **`compass/crawler-google-places`** - Real estate agents/builders reviews ($4/1k)
9. **`streamers/youtube-comments-scraper`** - Property review video comments ($0.50/1k)
10. **`fatihtahta/quora-scraper`** - "Best area to buy in Hyderabad" questions ($5/1k)

### Tier 4 - Supplementary
11. **`sovereigntaylor/telegram-scraper`** - Hyderabad property Telegram channels ($3/1k)

---

## Sources
- https://apify.com/easyapi/99acres-com-scraper
- https://apify.com/fatihtahta/99acres-scraper
- https://apify.com/stealth_mode/99acres-property-search-scraper
- https://apify.com/ecomscrape/magicbricks-property-search-scraper
- https://apify.com/ecomscrape/nobroker-property-search-scraper
- https://apify.com/data-slayer/facebook-group-posts
- https://apify.com/apify/facebook-groups-scraper
- https://apify.com/apify/instagram-scraper
- https://apify.com/apify/instagram-post-scraper
- https://apify.com/apidojo/instagram-comments-scraper
- https://apify.com/apidojo/tweet-scraper
- https://apify.com/apidojo/twitter-scraper-lite
- https://apify.com/streamers/youtube-comments-scraper
- https://apify.com/harvestapi/linkedin-post-search
- https://apify.com/harvestapi/linkedin-post-comments
- https://apify.com/supreme_coder/linkedin-post
- https://apify.com/compass/crawler-google-places
- https://apify.com/compass/google-maps-reviews-scraper
- https://apify.com/memo23/quora-scraper-with-optional-login
- https://apify.com/fatihtahta/quora-scraper
- https://apify.com/sovereigntaylor/telegram-scraper
- https://apify.com/dainty_screw/telegram-scraper
- https://docs.apify.com/api/v2
- https://docs.apify.com/api/v2/act-run-sync-get-dataset-items-post
- https://docs.apify.com/api/v2/act-runs-post
- https://docs.apify.com/academy/api/run-actor-and-retrieve-data-via-api
