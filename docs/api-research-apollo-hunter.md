# Contact Enrichment API Research: Apollo.io & Hunter.io

**Context:** Indian real estate lead discovery — leads from Hyderabad with name, platform username, sometimes LinkedIn URL. Goal: find email, phone number, company, job title.

---

## 1. Apollo.io API

### 1.1 Authentication

All requests require the `x-api-key` header:

```
x-api-key: YOUR_API_KEY
```

API keys are created in Apollo Settings > Integrations > API Keys. There are two types:
- **Master API Key** — required for People Search endpoint
- **Standard API Key** — works for enrichment endpoints

---

### 1.2 People Search API

**Use case:** Find IT professionals, managers, and other buyer personas in Hyderabad.

**Endpoint:**
```
POST https://api.apollo.io/api/v1/mixed_people/api_search
```

**Key facts:**
- Does NOT consume credits (free to search)
- Does NOT return emails or phone numbers (use Enrichment API after)
- Display limit: 50,000 records (100 per page, up to 500 pages)
- Requires Master API Key

**Request parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `person_titles[]` | string[] | Job titles to filter | `["IT Manager", "Software Engineer", "Project Manager"]` |
| `person_locations[]` | string[] | Person's location | `["Hyderabad, India"]` |
| `person_seniorities[]` | string[] | Seniority level | `["manager", "director", "vp"]` |
| `organization_locations[]` | string[] | Company HQ location | `["Hyderabad, India"]` |
| `q_organization_domains[]` | string[] | Company domains | `["tcs.com", "infosys.com"]` |
| `organization_num_employees_ranges[]` | string[] | Company size | `["1-10", "11-50", "51-200"]` |
| `contact_email_status[]` | string[] | Email verification status | `["verified", "unverified"]` |
| `q_keywords` | string | Free-text keyword search | `"real estate investor"` |
| `per_page` | integer | Results per page (max 100) | `25` |
| `page` | integer | Page number (max 500) | `1` |

**Example — Find IT managers in Hyderabad:**

```bash
curl --request POST \
  --url 'https://api.apollo.io/api/v1/mixed_people/api_search' \
  --header 'Content-Type: application/json' \
  --header 'Cache-Control: no-cache' \
  --header 'accept: application/json' \
  --header 'x-api-key: YOUR_API_KEY' \
  --data '{
    "person_titles": ["IT Manager", "Software Engineer", "Engineering Manager", "Tech Lead"],
    "person_locations": ["Hyderabad, India"],
    "person_seniorities": ["manager", "director", "senior"],
    "per_page": 25,
    "page": 1
  }'
```

**Response structure (emails/phones NOT included):**

```json
{
  "people": [
    {
      "id": "64a7ff0cc4dfae00013df1a5",
      "first_name": "Rajesh",
      "last_name": "Kumar",
      "name": "Rajesh Kumar",
      "linkedin_url": "http://www.linkedin.com/in/rajesh-kumar-12345",
      "title": "Engineering Manager",
      "headline": "Engineering Manager at TCS",
      "photo_url": "https://static.licdn.com/...",
      "twitter_url": null,
      "github_url": null,
      "facebook_url": null,
      "city": "Hyderabad",
      "state": "Telangana",
      "country": "India",
      "organization_id": "5e66b6381e05b4008c8331b8",
      "organization": {
        "name": "Tata Consultancy Services",
        "website_url": "tcs.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 25,
    "total_entries": 1250,
    "total_pages": 50
  }
}
```

---

### 1.3 People Enrichment API

**Use case:** Given a lead's name + company or LinkedIn URL, get their email, phone, company info, job title.

**Endpoint:**
```
POST https://api.apollo.io/api/v1/people/match
```

**Request parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `first_name` | string | Person's first name |
| `last_name` | string | Person's last name |
| `name` | string | Full name (alternative to first/last) |
| `email` | string | Known email address |
| `domain` | string | Company domain (e.g., "tcs.com") |
| `organization_name` | string | Company name |
| `linkedin_url` | string | LinkedIn profile URL |
| `reveal_personal_emails` | boolean | Return personal email addresses (costs credits) |
| `reveal_phone_number` | boolean | Return phone numbers (costs credits) |
| `run_waterfall_email` | boolean | Use waterfall enrichment for broader email coverage |
| `run_waterfall_phone` | boolean | Use waterfall enrichment for broader phone coverage |
| `webhook_url` | string | Webhook URL for async waterfall results |

**Example — Enrich by LinkedIn URL (our best path):**

```bash
curl --request POST \
  --url 'https://api.apollo.io/api/v1/people/match' \
  --header 'Content-Type: application/json' \
  --header 'Cache-Control: no-cache' \
  --header 'accept: application/json' \
  --header 'x-api-key: YOUR_API_KEY' \
  --data '{
    "linkedin_url": "http://www.linkedin.com/in/rajesh-kumar-12345",
    "reveal_personal_emails": true,
    "reveal_phone_number": true
  }'
```

**Example — Enrich by name + company:**

```bash
curl --request POST \
  --url 'https://api.apollo.io/api/v1/people/match' \
  --header 'Content-Type: application/json' \
  --header 'Cache-Control: no-cache' \
  --header 'accept: application/json' \
  --header 'x-api-key: YOUR_API_KEY' \
  --data '{
    "first_name": "Rajesh",
    "last_name": "Kumar",
    "organization_name": "Tata Consultancy Services",
    "domain": "tcs.com",
    "reveal_personal_emails": true,
    "reveal_phone_number": true
  }'
```

**Example — Enrich with Waterfall (async, broader coverage):**

```bash
curl --request POST \
  --url 'https://api.apollo.io/api/v1/people/match' \
  --header 'Content-Type: application/json' \
  --header 'Cache-Control: no-cache' \
  --header 'accept: application/json' \
  --header 'x-api-key: YOUR_API_KEY' \
  --data '{
    "first_name": "Rajesh",
    "last_name": "Kumar",
    "linkedin_url": "http://www.linkedin.com/in/rajesh-kumar-12345",
    "run_waterfall_email": true,
    "run_waterfall_phone": true,
    "webhook_url": "https://your-app.com/api/webhooks/apollo-enrichment"
  }'
```

**Response structure (full enrichment):**

```json
{
  "person": {
    "id": "64a7ff0cc4dfae00013df1a5",
    "first_name": "Rajesh",
    "last_name": "Kumar",
    "name": "Rajesh Kumar",
    "linkedin_url": "http://www.linkedin.com/in/rajesh-kumar-12345",
    "title": "Engineering Manager",
    "headline": "Engineering Manager at TCS",
    "email": "rajesh.kumar@tcs.com",
    "email_status": "verified",
    "photo_url": "https://static.licdn.com/...",
    "twitter_url": null,
    "github_url": null,
    "facebook_url": null,
    "extrapolated_email_confidence": 0.8,
    "city": "Hyderabad",
    "state": "Telangana",
    "country": "India",
    "organization_id": "5e66b6381e05b4008c8331b8",
    "organization": {
      "id": "5e66b6381e05b4008c8331b8",
      "name": "Tata Consultancy Services",
      "website_url": "tcs.com",
      "industry": "Information Technology & Services",
      "estimated_num_employees": 500000,
      "raw_address": "Mumbai, India",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India"
    },
    "phone_numbers": [
      {
        "raw_number": "+91 9876543210",
        "sanitized_number": "+919876543210",
        "type_cd": "mobile",
        "position": 0,
        "status_cd": "active",
        "dnc_status_cd": null,
        "dnc_other_info": null
      }
    ],
    "personal_emails": [
      "rajesh.kumar@gmail.com"
    ]
  }
}
```

**Key response fields for our use case:**

| Field | Path | Description |
|-------|------|-------------|
| Business email | `person.email` | Work email (1 credit) |
| Email status | `person.email_status` | "verified", "unverified", "guessed" |
| Personal emails | `person.personal_emails[]` | Personal email addresses (1 credit if reveal_personal_emails=true) |
| Phone numbers | `person.phone_numbers[].sanitized_number` | Phone number in E.164 (8 credits if reveal_phone_number=true) |
| Job title | `person.title` | Current job title |
| Company name | `person.organization.name` | Company name |
| Industry | `person.organization.industry` | Company industry |
| LinkedIn URL | `person.linkedin_url` | LinkedIn profile URL |
| Location | `person.city`, `person.state`, `person.country` | Person's location |

---

### 1.4 Bulk People Enrichment API

**Use case:** Enrich up to 10 leads per API call (batch processing).

**Endpoint:**
```
POST https://api.apollo.io/api/v1/people/bulk_match
```

**Example:**

```bash
curl --request POST \
  --url 'https://api.apollo.io/api/v1/people/bulk_match' \
  --header 'Content-Type: application/json' \
  --header 'Cache-Control: no-cache' \
  --header 'accept: application/json' \
  --header 'x-api-key: YOUR_API_KEY' \
  --data '{
    "reveal_personal_emails": true,
    "reveal_phone_number": true,
    "details": [
      {
        "first_name": "Rajesh",
        "last_name": "Kumar",
        "linkedin_url": "http://www.linkedin.com/in/rajesh-kumar-12345"
      },
      {
        "first_name": "Priya",
        "last_name": "Sharma",
        "organization_name": "Infosys",
        "domain": "infosys.com"
      },
      {
        "first_name": "Amit",
        "last_name": "Patel",
        "linkedin_url": "http://www.linkedin.com/in/amit-patel-67890"
      }
    ]
  }'
```

**Rate limit:** 50% of People Enrichment per-minute limit; 100% of hourly/daily limits.

---

### 1.5 Apollo.io Rate Limits

| Plan | Requests/Minute | Requests/Day |
|------|-----------------|--------------|
| Free | 50 | 600 |
| Basic ($49/mo) | 200 | 2,000 |
| Professional ($79/mo) | 200 | 2,000 |
| Organization ($119/mo) | 200 | 2,000+ |

Rate limiting strategy: Fixed-window per minute/hour/day.

---

### 1.6 Apollo.io Pricing & Credits

**Plans (per user/month, billed annually):**

| Plan | Price | Total Credits | Mobile Credits | Export Credits |
|------|-------|---------------|----------------|---------------|
| Free | $0 | 100 | 5 | 10 |
| Basic | $49 | 5,000 | 75 | 1,000 |
| Professional | $79 | 10,000 | 100 | 2,000 |
| Organization | $119 | 15,000 | 200 | 4,000 |

**Credit costs per action:**

| Action | Credit Cost |
|--------|------------|
| Business email reveal | 1 credit |
| Personal email reveal | 1 credit |
| Mobile phone number reveal | 8 credits |
| Export to CSV/CRM/API | 1 export credit |
| Waterfall email enrichment | 1-5 credits (depends on data source) |
| Waterfall phone enrichment | 3-9 credits (depends on data source) |
| People Search (no reveal) | 0 credits (free) |

**Overage:** $0.20 per additional credit. Minimum purchase: 250 monthly or 2,500 annual credits. Unused credits expire at end of billing cycle.

---

## 2. Hunter.io API

### 2.1 Authentication

Three authentication methods (all equivalent):

```bash
# Method 1: Query parameter
?api_key=YOUR_API_KEY

# Method 2: Header
X-API-KEY: YOUR_API_KEY

# Method 3: Bearer token
Authorization: Bearer YOUR_API_KEY
```

**Base URL:** `https://api.hunter.io/v2/`

**Test API key:** `test-api-key` (validates parameters, returns dummy data)

---

### 2.2 Domain Search API

**Use case:** Find all email addresses at a company domain.

**Endpoint:**
```
GET https://api.hunter.io/v2/domain-search
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | Yes* | Company domain (e.g., "tcs.com") |
| `company` | string | Yes* | Company name (alternative to domain) |
| `limit` | integer | No | Number of results (default 10) |
| `offset` | integer | No | Pagination offset |
| `type` | string | No | `"personal"` or `"generic"` |
| `seniority` | string | No | `"junior"`, `"senior"`, `"executive"` |
| `department` | string | No | `"it"`, `"finance"`, `"management"`, etc. |
| `api_key` | string | Yes | Your API key |

*Either `domain` or `company` is required.

**Example — Find emails at a Hyderabad company:**

```bash
curl "https://api.hunter.io/v2/domain-search?domain=tcs.com&type=personal&department=it&limit=20&api_key=YOUR_API_KEY"
```

**Response:**

```json
{
  "data": {
    "domain": "tcs.com",
    "disposable": false,
    "webmail": false,
    "accept_all": false,
    "pattern": "{first}.{last}",
    "organization": "Tata Consultancy Services",
    "country": "IN",
    "state": null,
    "emails": [
      {
        "value": "rajesh.kumar@tcs.com",
        "type": "personal",
        "confidence": 92,
        "first_name": "Rajesh",
        "last_name": "Kumar",
        "position": "Engineering Manager",
        "position_raw": "Engineering Manager - Digital Solutions",
        "seniority": "senior",
        "department": "it",
        "linkedin": "https://www.linkedin.com/in/rajesh-kumar-12345",
        "twitter": null,
        "phone_number": null,
        "verification": {
          "date": "2025-06-15",
          "status": "valid"
        },
        "sources": [
          {
            "domain": "github.com",
            "uri": "https://github.com/rajeshkumar",
            "extracted_on": "2024-03-15",
            "last_seen_on": "2025-06-01",
            "still_on_page": true
          }
        ]
      }
    ],
    "linked_domains": [],
    "emails_count": {
      "personal": 45,
      "generic": 12,
      "total": 57
    }
  },
  "meta": {
    "results": 20,
    "limit": 20,
    "offset": 0,
    "params": {
      "domain": "tcs.com",
      "company": null,
      "type": "personal",
      "seniority": null,
      "department": "it"
    }
  }
}
```

**Key response fields:**
- `data.pattern` — Email pattern for this domain (e.g., `{first}.{last}`)
- `data.emails[].value` — The email address
- `data.emails[].confidence` — 0-100 confidence score
- `data.emails[].first_name`, `last_name` — Person name
- `data.emails[].position` — Job title
- `data.emails[].seniority` — Seniority level
- `data.emails[].department` — Department
- `data.emails[].verification.status` — "valid", "invalid", "accept_all", "unknown"
- `data.emails[].sources[]` — Where the email was found online

**Rate limits:** 15 requests/second, 500 requests/minute.
**Credit cost:** 1 search credit per 10 results returned. Each additional 10 results = 1 more credit.

---

### 2.3 Email Finder API

**Use case:** Find a specific person's email given their name + company domain, OR their LinkedIn handle.

**Endpoint:**
```
GET https://api.hunter.io/v2/email-finder
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | Yes* | Company domain |
| `company` | string | Yes* | Company name (alt to domain) |
| `first_name` | string | Yes** | Person's first name |
| `last_name` | string | Yes** | Person's last name |
| `linkedin_handle` | string | Yes** | LinkedIn handle (alt to name) |
| `api_key` | string | Yes | Your API key |

*Either `domain` or `company` required.
**Either (`first_name` + `last_name`) or `linkedin_handle` required.

**Example — Find email by name + domain:**

```bash
curl "https://api.hunter.io/v2/email-finder?domain=tcs.com&first_name=Rajesh&last_name=Kumar&api_key=YOUR_API_KEY"
```

**Example — Find email by LinkedIn handle:**

```bash
curl "https://api.hunter.io/v2/email-finder?domain=tcs.com&linkedin_handle=rajesh-kumar-12345&api_key=YOUR_API_KEY"
```

**Response:**

```json
{
  "data": {
    "first_name": "Rajesh",
    "last_name": "Kumar",
    "email": "rajesh.kumar@tcs.com",
    "score": 92,
    "domain": "tcs.com",
    "accept_all": false,
    "position": "Engineering Manager",
    "twitter": null,
    "linkedin_url": "https://www.linkedin.com/in/rajesh-kumar-12345",
    "phone_number": null,
    "company": "Tata Consultancy Services",
    "sources": [
      {
        "domain": "github.com",
        "uri": "https://github.com/rajeshkumar",
        "extracted_on": "2024-03-15",
        "last_seen_on": "2025-06-01",
        "still_on_page": true
      }
    ],
    "verification": {
      "date": "2025-06-15",
      "status": "valid"
    }
  },
  "meta": {
    "params": {
      "first_name": "Rajesh",
      "last_name": "Kumar",
      "full_name": null,
      "domain": "tcs.com",
      "company": null
    }
  }
}
```

**Rate limits:** 15 requests/second, 500 requests/minute.
**Credit cost:** 1 search credit per request.

---

### 2.4 Email Verifier API

**Use case:** Verify if an email we found (from Apollo or elsewhere) is actually deliverable.

**Endpoint:**
```
GET https://api.hunter.io/v2/email-verifier
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes | Email to verify |
| `api_key` | string | Yes | Your API key |

**Example:**

```bash
curl "https://api.hunter.io/v2/email-verifier?email=rajesh.kumar@tcs.com&api_key=YOUR_API_KEY"
```

**Response:**

```json
{
  "data": {
    "status": "valid",
    "result": "deliverable",
    "score": 100,
    "email": "rajesh.kumar@tcs.com",
    "regexp": true,
    "gibberish": false,
    "disposable": false,
    "webmail": false,
    "mx_records": true,
    "smtp_server": true,
    "smtp_check": true,
    "accept_all": false,
    "block": false,
    "sources": [
      {
        "domain": "github.com",
        "uri": "https://github.com/rajeshkumar",
        "extracted_on": "2024-03-15",
        "last_seen_on": "2025-06-01",
        "still_on_page": true
      }
    ]
  },
  "meta": {
    "params": {
      "email": "rajesh.kumar@tcs.com"
    }
  }
}
```

**Status values:** `"valid"`, `"invalid"`, `"accept_all"`, `"webmail"`, `"disposable"`, `"unknown"`

**Rate limits:** 15 requests/second, 500 requests/minute.
**Credit cost:** 1 verification credit per request (separate from search credits).

---

### 2.5 Combined Enrichment API

**Use case:** Given an email or LinkedIn handle, get full person + company profile.

**Endpoint:**
```
GET https://api.hunter.io/v2/combined/find
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string | Yes* | Email address |
| `linkedin_handle` | string | Yes* | LinkedIn profile handle |
| `api_key` | string | Yes | Your API key |

*At least one of `email` or `linkedin_handle` required. If both provided, LinkedIn handle takes priority.

**Example:**

```bash
curl "https://api.hunter.io/v2/combined/find?email=rajesh.kumar@tcs.com&api_key=YOUR_API_KEY"
```

```bash
curl "https://api.hunter.io/v2/combined/find?linkedin_handle=rajesh-kumar-12345&api_key=YOUR_API_KEY"
```

**Response (person + company combined):**

```json
{
  "data": {
    "person": {
      "id": "abc123",
      "fullName": "Rajesh Kumar",
      "givenName": "Rajesh",
      "familyName": "Kumar",
      "email": "rajesh.kumar@tcs.com",
      "location": "Hyderabad, India",
      "timeZone": "Asia/Kolkata",
      "utcOffset": 5.5,
      "geo": {
        "city": "Hyderabad",
        "state": "Telangana",
        "country": "India",
        "lat": 17.385044,
        "lng": 78.486671
      },
      "bio": "Engineering Manager with 10+ years in IT...",
      "avatar": "https://...",
      "employment": {
        "domain": "tcs.com",
        "name": "Tata Consultancy Services",
        "title": "Engineering Manager",
        "role": "engineering",
        "seniority": "manager"
      },
      "facebook": null,
      "github": "rajeshkumar",
      "twitter": null,
      "linkedin": "rajesh-kumar-12345"
    },
    "company": {
      "id": "xyz789",
      "name": "Tata Consultancy Services",
      "legalName": "Tata Consultancy Services Limited",
      "domain": "tcs.com",
      "domainAliases": ["tcs.in"],
      "site": {
        "phoneNumbers": ["+91 22 67789999"],
        "emailAddresses": ["info@tcs.com"]
      },
      "category": {
        "sector": "Technology",
        "industryGroup": "Software & Services",
        "industry": "IT Services"
      },
      "description": "...",
      "foundedYear": 1968,
      "location": "Mumbai, Maharashtra, India",
      "metrics": {
        "employees": 500000,
        "employeesRange": "10001+",
        "marketCap": null,
        "raised": null,
        "annualRevenue": null
      }
    }
  }
}
```

**Rate limits:** 15 requests/second, 500 requests/minute.
**Credit cost:** 1 search credit (charged only when core data is returned).

---

### 2.6 Hunter.io Pricing

| Plan | Price/Month (Annual) | Monthly Credits | Searches | Verifications |
|------|---------------------|-----------------|----------|---------------|
| Free | $0 | 50 | 25 | 50 |
| Starter | $34 ($49 monthly) | 2,000 | 1,000 | 2,000 |
| Growth | $104 ($149 monthly) | 10,000 | 5,000 | 10,000 |
| Scale | $209 ($299 monthly) | 25,000 | 12,500 | 25,000 |
| Enterprise | Custom | Custom | Custom | Custom |

**Credit costs:**
- Domain Search: 1 credit per 10 results
- Email Finder: 1 credit per request
- Email Verifier: 1 credit per verification
- Combined Enrichment: 1 credit per request

---

## 3. Recommended Enrichment Strategy for PropLeads

### 3.1 Flow: Lead Detected -> Enriched Contact

```
Lead Detected (name, username, city, maybe LinkedIn URL)
    │
    ├─ Has LinkedIn URL? ──YES──> Apollo People Enrichment (by linkedin_url)
    │                                 reveal_personal_emails=true
    │                                 reveal_phone_number=true
    │                                 [Cost: 1 + 8 = 9 credits]
    │                                     │
    │                                     ├─ Got email? ──YES──> Hunter Email Verifier
    │                                     │                        [Cost: 1 Hunter credit]
    │                                     │
    │                                     └─ No email? ──> Hunter Email Finder
    │                                                        (name + domain from Apollo org)
    │                                                        [Cost: 1 Hunter credit]
    │
    └─ No LinkedIn URL? ──> Do we know their company?
                               │
                               ├─ YES ──> Apollo People Enrichment (name + domain/org)
                               │            [Same flow as above]
                               │
                               └─ NO ──> Apollo People Search first
                                           (name + location: Hyderabad)
                                           [Cost: 0 credits - search is free]
                                               │
                                               └─ Found match? ──> Apollo People Enrichment
                                                                     [9 credits per lead]
```

### 3.2 Why This Strategy

1. **Apollo for primary enrichment:** Apollo is the best source for phone numbers (Hunter rarely returns them). Apollo also returns job title, company info, and LinkedIn URL in a single call.

2. **Hunter for email verification:** Apollo email_status can be "verified", "unverified", or "guessed". For any non-verified email, run it through Hunter's Email Verifier for a second opinion (SMTP check, MX records check, etc.).

3. **Hunter as email fallback:** If Apollo can't find an email but returns the company domain, use Hunter Email Finder (name + domain) as a fallback. Hunter has a separate email database crawled from the web.

4. **Hunter Combined Enrichment as secondary source:** If Apollo returns sparse data, Hunter's Combined Enrichment can fill gaps (especially employment info, social profiles, and company details).

5. **Apollo Search is free:** The People Search API costs zero credits and is great for finding leads to enrich. Use it to build prospect lists of IT professionals in Hyderabad before enriching them.

### 3.3 Cost Estimation

**Per-lead cost (Apollo + Hunter verification):**

| Scenario | Apollo Credits | Hunter Credits | Approx Cost |
|----------|---------------|----------------|-------------|
| LinkedIn URL available, email found | 9 (1 email + 8 phone) | 1 (verify) | ~$1.80 + $0.034 |
| Name + company, email found | 9 | 1 | ~$1.80 + $0.034 |
| Name only, search + enrich | 0 (search) + 9 (enrich) | 1 | ~$1.80 + $0.034 |
| Apollo fails, Hunter fallback | 9 | 1 (find) + 1 (verify) | ~$1.80 + $0.068 |

*Apollo cost assumes $0.20/credit overage pricing. Hunter cost assumes Growth plan ($0.034/credit).*

**Monthly budget estimates:**

| Leads/Month | Apollo Credits Needed | Apollo Plan | Hunter Credits | Hunter Plan | Total/Month |
|-------------|----------------------|-------------|----------------|-------------|-------------|
| 100 | 900 | Basic ($49) | 200 | Free ($0) | ~$49 |
| 500 | 4,500 | Basic ($49) | 1,000 | Starter ($34) | ~$83 |
| 1,000 | 9,000 | Professional ($79) | 2,000 | Starter ($34) | ~$113 |
| 5,000 | 45,000 | Organization ($119) + overage | 10,000 | Growth ($104) | ~$223+ |

### 3.4 Implementation Notes

1. **Rate limiting:** Implement request queuing. Apollo Free = 50 req/min, Hunter = 15 req/sec. Use exponential backoff on 429 responses.

2. **Waterfall enrichment (Apollo):** For higher-value leads, enable `run_waterfall_email` and `run_waterfall_phone` with a webhook. This queries multiple third-party data sources asynchronously for better coverage, but costs more credits (1-5 for email, 3-9 for phone).

3. **Batch processing:** Use Apollo's Bulk People Enrichment (`/api/v1/people/bulk_match`) for up to 10 leads per request. More efficient but rate-limited to 50% of single enrichment per-minute limit.

4. **Matching quality:** Provide as many identifiers as possible. LinkedIn URL alone gives the best match rate. Name + company domain is second best. Name + company name is third. Name alone rarely matches correctly.

5. **Indian phone numbers:** Apollo's phone database for India is less comprehensive than US/EU. Expect ~30-50% hit rate for Indian mobile numbers vs ~60-80% for US contacts. Consider supplementing with local data sources.

6. **Email patterns:** Hunter's Domain Search returns the `pattern` field (e.g., `{first}.{last}@company.com`). Cache this per domain — useful for generating email guesses when neither API finds a verified address.

7. **Credit conservation:** Apollo People Search is free. Use it aggressively to pre-qualify leads before spending enrichment credits. Only enrich leads that match your buyer persona criteria.
