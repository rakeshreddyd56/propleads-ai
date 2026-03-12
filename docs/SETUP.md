# PropLeads AI — Production Setup Guide

## Prerequisites

- Node.js >= 20.9 (recommended: 24.x)
- A Vercel account (for deployment + Blob storage)
- A GitHub account (to connect repo to Vercel)

---

## Step 1: Neon PostgreSQL Database

Neon provides serverless Postgres with a generous free tier.

1. Go to [neon.tech](https://neon.tech) and sign up
2. Click **"New Project"**
3. Set:
   - Project name: `propleads`
   - Region: **Asia Pacific (Singapore)** — closest to India
   - Database name: `propleads`
4. After creation, copy the **connection string** from the dashboard
   - It looks like: `postgresql://user:pass@ep-xxx-yyy.ap-southeast-1.aws.neon.tech/propleads?sslmode=require`
5. Add to your `.env`:
   ```
   DATABASE_URL="postgresql://user:pass@ep-xxx-yyy.ap-southeast-1.aws.neon.tech/propleads?sslmode=require"
   ```
6. Push the schema and seed:
   ```bash
   npx prisma db push
   npm run db:seed
   ```
7. Verify with:
   ```bash
   npx prisma studio
   ```
   This opens a browser UI at localhost:5555 where you can see all tables and data.

---

## Step 2: Clerk Authentication

Clerk handles sign-up, sign-in, and organization management.

1. Go to [clerk.com](https://clerk.com) and sign up
2. Click **"Create Application"**
3. Set:
   - App name: `PropLeads AI`
   - Sign-in options: Enable **Email**, **Google** (recommended for ease)
4. From the Clerk dashboard sidebar, go to **API Keys**
5. Copy both keys and add to `.env`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
   CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxx
   ```
6. Still in Clerk dashboard, go to **Organizations** (sidebar) and **enable organizations**:
   - Toggle "Enable organizations" ON
   - This allows users to create teams and share leads/properties within an org
7. Set redirect URLs under **Paths** (sidebar):
   ```
   Sign-in URL: /sign-in
   Sign-up URL: /sign-up
   After sign-in URL: /
   After sign-up URL: /
   ```
   (The app auto-redirects signed-in users from `/` to `/dashboard`)

### Clerk Organizations — How It Works

- When a user signs up, they can optionally create a Clerk "Organization" (team)
- If they don't create one, the app auto-creates a personal workspace for them
- The `resolveOrg()` helper in `src/lib/auth.ts` handles the mapping:
  - Clerk org ID → DB Organization record (auto-created on first API call)
  - No Clerk org → personal workspace (auto-created by user ID)
- All data (leads, properties, scraping sources) is scoped to the Organization

---

## Step 3: Anthropic API Key

Powers all AI features: brochure extraction, intent detection, lead scoring, property matching, conversation coaching.

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up / sign in
3. Go to **API Keys** and click **"Create Key"**
4. Name it `propleads-prod` and copy the key
5. Add to `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx
   ```
6. Add billing: Go to **Plans & Billing** → add a payment method
   - The app uses `claude-sonnet-4-20250514` which costs ~$3/1M input tokens
   - Typical usage: ~$5-20/month depending on lead volume

### Cost Estimate

| Feature | Tokens per call | Calls/day (est.) | Monthly cost |
|---------|----------------|-------------------|-------------|
| Intent Detection | ~2K | 50-200 | $1-4 |
| Lead Scoring | ~1K | 50-200 | $0.50-2 |
| Property Matching | ~2K | 20-50 | $0.50-2 |
| Brochure Extraction | ~5K | 1-5 | $0.10-0.50 |
| Conversation Coach | ~3K | 10-30 | $0.50-2 |
| **Total** | | | **$3-11/month** |

---

## Step 4: Vercel Blob Storage

Stores uploaded brochure PDFs and images.

1. Go to [vercel.com](https://vercel.com) and sign in
2. If you haven't deployed yet, create the project first (Step 7 below), then come back here
3. In your Vercel project dashboard, go to **Storage** tab
4. Click **"Create Database"** → select **Blob**
5. Name it `propleads-brochures` and create
6. Go to the Blob store settings → copy the **Read/Write Token**
7. Add to `.env`:
   ```
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxx
   ```

---

## Step 5: Inngest (Background Jobs)

Inngest runs the automated scraping cron jobs (every 6 hours).

1. Go to [inngest.com](https://inngest.com) and sign up
2. Click **"Create App"**
3. Name it `propleads-ai`
4. From the app dashboard, go to **Keys**
5. Copy both keys and add to `.env`:
   ```
   INNGEST_EVENT_KEY=xxxxxxxx
   INNGEST_SIGNING_KEY=signkey-prod-xxxxxxxx
   ```
6. After deploying to Vercel, register your Inngest endpoint:
   - In the Inngest dashboard, go to **Apps** → **Sync**
   - Enter your production URL: `https://your-app.vercel.app/api/inngest`
   - Click **Sync**
   - You should see the `scrape-reddit` function appear with its `0 */6 * * *` cron schedule

### Local Development with Inngest

For local dev, use the Inngest dev server:
```bash
npx inngest-cli@latest dev
```
This starts a local Inngest server at `http://localhost:8288` that auto-discovers your `/api/inngest` endpoint.

---

## Step 6: Optional Services

### Reddit API (Lead Scraping)

1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Click **"create another app..."** at the bottom
3. Set:
   - Name: `PropLeads AI`
   - Type: **script**
   - Redirect URI: `http://localhost:3000` (not used, but required)
4. After creation, copy the **client ID** (under the app name) and **secret**
5. Add to `.env`:
   ```
   REDDIT_CLIENT_ID=xxxxxxxxxxxx
   REDDIT_CLIENT_SECRET=xxxxxxxxxxxx
   REDDIT_USER_AGENT="PropLeadsAI/1.0 (by /u/your_username)"
   ```

### Firecrawl (Web Scraping)

1. Go to [firecrawl.dev](https://www.firecrawl.dev) and sign up
2. Get your API key from the dashboard
3. Add to `.env`:
   ```
   FIRECRAWL_API_KEY=fc-xxxxxxxxxxxx
   ```

### Apify (Portal Scraping — 99acres, MagicBricks, NoBroker, Facebook)

1. Go to [apify.com](https://apify.com) and sign up
2. Go to **Settings** → **Integrations** → copy your API token
3. Add to `.env`:
   ```
   APIFY_API_TOKEN=apify_api_xxxxxxxxxxxx
   ```
4. Free tier includes $5/month in platform credits

### Resend (Email Outreach)

1. Go to [resend.com](https://resend.com) and sign up
2. Go to **API Keys** → create a key
3. Add to `.env`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   ```
4. **Important**: Add and verify your sending domain:
   - Go to **Domains** → **Add Domain**
   - Add `propleads.ai` (or your domain)
   - Add the DNS records Resend provides (MX, TXT, DKIM)
   - Without domain verification, you can only send to your own email
5. Update the default `from` address in `src/lib/outreach/email.ts` if using a different domain

### AiSensy (WhatsApp Outreach)

1. Go to [aisensy.com](https://www.aisensy.com) and sign up
2. Connect your WhatsApp Business Account
3. Get your API key from the dashboard
4. Add to `.env`:
   ```
   AISENSY_API_KEY=xxxxxxxxxxxx
   ```
5. **Important**: You must get WhatsApp message templates approved by Meta before sending outreach messages. The pre-seeded templates in the DB are content examples — you need to submit them to AiSensy/Meta for approval.

### Apollo.io (Lead Enrichment — Email/Phone/Company)

1. Go to [apollo.io](https://www.apollo.io) and sign up (free tier: 50 credits/month)
2. Go to **Settings** → **API** → create an API key
3. Add to `.env`:
   ```
   APOLLO_API_KEY=xxxxxxxxxxxx
   ```

### Hunter.io (Email Finder + Verification)

1. Go to [hunter.io](https://hunter.io) and sign up (free tier: 25 searches/month)
2. Go to **API** → copy your API key
3. Add to `.env`:
   ```
   HUNTER_API_KEY=xxxxxxxxxxxx
   ```

---

## Step 7: Deploy to Vercel

1. **Push to GitHub**:
   ```bash
   git init
   git add -A
   git commit -m "feat: PropLeads AI platform"
   git remote add origin https://github.com/YOUR_USERNAME/propleads-ai.git
   git push -u origin main
   ```

2. **Import on Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Select your `propleads-ai` repository
   - Framework: **Next.js** (auto-detected)
   - Root directory: `.` (default)

3. **Set environment variables** in Vercel project settings:
   - Go to **Settings** → **Environment Variables**
   - Add ALL variables from your `.env` file
   - Required for first deploy:
     - `DATABASE_URL`
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
     - `CLERK_SECRET_KEY`
     - `ANTHROPIC_API_KEY`
     - `BLOB_READ_WRITE_TOKEN`
   - Optional (add later):
     - `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
     - `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT`
     - `FIRECRAWL_API_KEY`, `APIFY_API_TOKEN`
     - `RESEND_API_KEY`, `AISENSY_API_KEY`
     - `APOLLO_API_KEY`, `HUNTER_API_KEY`

4. **Deploy** — click "Deploy" and wait ~2 minutes

5. **Run migrations** after deploy:
   ```bash
   # From your local machine, with DATABASE_URL set
   npx prisma db push
   npm run db:seed
   ```

6. **Register Inngest** (if using background scraping):
   - Go to inngest.com → Apps → Sync
   - URL: `https://your-app.vercel.app/api/inngest`

7. **Update Clerk** redirect URLs for production:
   - In Clerk dashboard → **Domains**
   - Add your Vercel domain: `https://your-app.vercel.app`

---

## Step 8: Verify End-to-End

After deployment, test each flow:

1. **Sign up** → create account → verify you land on `/dashboard`
2. **Upload a property** → Properties → Upload Brochure → upload a PDF
   - Verify AI extracts property details (needs ANTHROPIC_API_KEY)
   - Verify PDF stored (needs BLOB_READ_WRITE_TOKEN)
3. **Check scraping sources** → Scraping → should see 12 pre-seeded sources
4. **Trigger a scrape** → Scraping → click trigger (needs REDDIT_* or APIFY_* keys)
5. **View leads** → Leads → any scraped leads appear with AI scores
6. **AI Coach** → Coach → generate a message for a persona + property
7. **Send outreach** → Outreach → test email (needs RESEND_API_KEY)
8. **Analytics** → verify charts render with data

---

## Complete .env Template

```env
# === REQUIRED ===

# Database (Neon)
DATABASE_URL="postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/propleads?sslmode=require"

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# AI (Anthropic)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx

# File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxx

# Background Jobs (Inngest)
INNGEST_EVENT_KEY=xxxxxxxxxxxx
INNGEST_SIGNING_KEY=signkey-prod-xxxxxxxxxxxx

# === OPTIONAL ===

# Scraping - Reddit
REDDIT_CLIENT_ID=xxxxxxxxxxxx
REDDIT_CLIENT_SECRET=xxxxxxxxxxxx
REDDIT_USER_AGENT="PropLeadsAI/1.0 (by /u/your_username)"

# Scraping - Web
FIRECRAWL_API_KEY=fc-xxxxxxxxxxxx

# Scraping - Portals & Social
APIFY_API_TOKEN=apify_api_xxxxxxxxxxxx

# Outreach - Email
RESEND_API_KEY=re_xxxxxxxxxxxx

# Outreach - WhatsApp
AISENSY_API_KEY=xxxxxxxxxxxx

# Enrichment
APOLLO_API_KEY=xxxxxxxxxxxx
HUNTER_API_KEY=xxxxxxxxxxxx
```

---

## Troubleshooting

### "Unauthorized" on all API calls
- Make sure you're signed in via Clerk
- Check that `CLERK_SECRET_KEY` is set in env vars
- The app auto-creates a DB organization on first authenticated request

### Brochure upload fails
- Check `BLOB_READ_WRITE_TOKEN` is set
- Check `ANTHROPIC_API_KEY` is set and has billing enabled
- Max file size is 10MB (configured in `next.config.ts`)

### Scraping returns no results
- Reddit: Ensure all 3 Reddit env vars are set (`CLIENT_ID`, `CLIENT_SECRET`, `USER_AGENT`)
- Portals: Ensure `APIFY_API_TOKEN` is set and has credits
- Check Inngest dashboard for function run logs

### Database connection issues
- Neon free tier suspends after 5 min of inactivity — first request may be slow (~2s cold start)
- Use `?sslmode=require` in the connection string
- Check that your IP isn't blocked in Neon's project settings

### Emails not sending
- Resend requires domain verification for production sends
- Without verified domain, emails only go to the account owner's email
- Check Resend dashboard for delivery logs
