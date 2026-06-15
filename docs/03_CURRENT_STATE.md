# 03 — Current State

> Snapshot taken **June 14, 2026**. Updates required after any meaningful change.

---

## What's deployed in production

- **Hosting:** Render Starter ($7/mo, always-on)
- **Production URL:** https://welcomematdigital.com → https://frontdesk-ai-vx1s.onrender.com
- **Auto-deploy:** Render watches `master`. Pushing to `master` = immediate production deploy. No staging.
- **Health check:** `GET /health` returns `{ status: 'ok', timestamp: ... }`
- **Last commit on master:** `5e3dc3c` — "privacy: add explicit no-share clause for SMS opt-in / mobile info per Twilio compliance guidance" (June 14, 2026)

---

## Live customer sites

| Slug | Customer | Status | URL | Notes |
|---|---|---|---|---|
| `camellia-cleaning` | Kesia Soares (house cleaner) | **Live preview, no contract yet** | `/site/camellia-cleaning` and (planned) `camelliacleaning.com` | Quote form active, chat widget active, Google reviews wired with manual fallback, EN/PT/ES |
| (none other) | | | | |

---

## Active demos (`public/demos/`)

All are reachable at `/demos/{slug}/` and indexed at `/demos/index.html`.

**Hand-built archetypes (most polished, considered "reference quality"):**
- `tree-service/` — Summit Tree Care (Bitter + Outfit, dark bark + amber)
- `landscaping-v2/` — Greenline Landscapes (Playfair + DM Sans, forest + terracotta)
- `cleaning-b/`, `cleaning-c/` — cleaning archetype variants
- `salon/` — Studio Miel (editorial bento layout — most recent design experiment, May 23)

**Template-generated demos (via `tools/spin-demo.js`):**
- `handyman/`
- `landscaping/`
- `restaurant/`
- `pristine-home-cleaning/`
- `pacific-carpet-care/`
- `quickturn-locksmith/`
- `clear-it-out-junk-removal/`
- `signready-mobile-notary/`
- `mirror-finish-auto-detailing/`
- `summit-tree-care/`
- `madras-dosa-corner/`
- `simply-indian/`
- `southern-spice/`

**Reference templates** (for new builds, not customer-facing):
- `public/templates/bold-trade/index.html`
- `public/templates/fresh-clean/index.html`

---

## Generated outreach sites (`public/sites/`)

Pre-built demo pages used in cold outreach to specific prospects:
- `aloha-junk-removal/`
- `bigfoot-tree-care/`
- `camellia-cleaning/` ← live customer site
- `d-k-carpet-floor-cleaning-and-repairs-llc/`
- `legacy-services-carpet-cleaning-llc/`
- `tree-service-by-northwest/`

---

## Features shipped (verified from code + git log)

### Chat widget
- File: `public/widget/frontdesk-widget.js`
- Loaded via `<script data-business="{slug}" data-server="..." src="/widget/frontdesk-widget.js"></script>`
- SVG icons, smooth animations
- Auto-greeting tooltip after 3s
- Tracks page language via `frontdesk-lang-change` event and forwards as `lang` param to `/api/chat`
- Per-business theming from `theme_color` column

### Chat API (`server/routes/chat.js`)
- `POST /api/chat` with `{ businessId, conversationId?, message, lang }`
- Looks up business → loads `system_prompt` from DB
- Injects current date/time into prompt so AI knows what day it is
- Injects language instruction when `lang !== 'en'`
- Appends `IMPORTANT GUARDRAIL` clause: only answers questions about the business; politely redirects off-topic queries
- Persists user + assistant messages to `messages` table
- Conversation history limited to last 20 messages for context window control
- Message length capped at 2000 chars
- Model: `openai.chat.completions.create()` — model name set in code (currently `gpt-4o-mini`)

### Quote intake (`server/routes/quote.js`)
- `POST /api/quote` with `{ businessSlug, service, answers, customerName, customerPhone, customerEmail? }`
- Validates phone is 10–15 digits
- Saves to `quote_requests` table with random `view_token`
- Sends email notification via Resend to `NOTIFICATION_EMAIL` env var (single global email, not per-business)
- Email includes Call Back / Text Back buttons + link to token-protected view page
- `GET /quote/:id?t=TOKEN` — public, token-protected detail page (no login)
- `PATCH /api/quote/:id/status?t=TOKEN` — status updates (new → contacted → quoted → booked → closed)

### Reviews (`server/routes/reviews.js`)
- `GOOGLE_PLACES_API_KEY` driven
- 24-hour in-memory cache (`CACHE_TTL_MS`)
- Manual review fallback hardcoded per slug (currently only `camellia-cleaning`)
- Handles short Google Maps URLs → resolves to Place IDs
- Handles hex-format Place IDs

### Admin console (`public/admin.html`, `server/routes/admin.js`)
- JWT login via `ADMIN_PASSWORD` env var → returns 7-day token
- All `/api/admin/*` routes protected by `requireAuth` middleware
- Endpoints (per `README.md` and `admin.js`):
  - Stats dashboard (counts)
  - Business CRUD + system prompt editing
  - Conversation viewer
  - Submissions inbox (red badge for new)
  - Customer pipeline tracker (12 stages: lead → contacted → submitted → in-review → prompt-ready → chat-live → site-building → preview-sent → revising → approved → domain-setup → live)
  - AI Enhance — `POST /api/admin/ai/enhance` improves a single form field
  - AI Generate Prompt — `POST /api/admin/ai/generate-prompt` produces system prompt from form data
- In-memory rate limiter (NOT redis-backed — resets on restart)

### Onboarding form (`public/onboard.html`)
- EN / PT / ES language gate at top
- Simplified for service pros (single hours textarea, 2 policy fields)
- 3 tone presets, brand color picker, privacy notice
- Submission saves to `submissions` table → triggers pipeline record at "submitted" stage
- Browser notification on new submission (admin side)

### File upload (`server/routes/upload.js`)
- `POST /api/upload` — multipart, up to 10 files, 5MB each, images only
- Stored in Cloudflare R2 (S3-compatible), bucket `welcomemat-uploads`
- Files keyed as `photos/{slug}/{uuid}.{ext}`
- `GET /api/upload/photos/:slug/:filename` proxies images from R2 (keeps bucket private)

### Custom domain routing (`server/index.js`)
- `PLATFORM_HOSTS` = `localhost`, `frontdesk-ai-vx1s.onrender.com`, `welcomematdigital.com`, `www.welcomematdigital.com`
- Any other hostname → looks up `businesses.domain` column → serves their `/site/{slug}` page
- Falls back to platform homepage if no match

### Marketing surface
- `/` — WelcomeMat Digital holdco homepage (`public/index.html`)
- `/pitch` and `/frontdesk` — old FrontDesk pitch page (`public/pitch.html`)
- `/swoop` — Swoop product page (`public/swoop/index.html`)
- `/swoop/privacy.html` — SMS Privacy Policy (Twilio TFV compliance)
- `/swoop/terms.html` — Terms of Service
- `/swoop/consent.html` — Standalone Opt-In Flow (Twilio Huvi feedback, added June 4)
- `/contact` — multilingual lead capture form

### Site server (`server/routes/site.js`)
- `GET /site/:slug` looks up business → loads `public/sites/{slug}/index.html` or `public/sites/_template.html` fallback
- Injects placeholders: `{{BUSINESS_NAME}}`, `{{BUSINESS_SLUG}}`, `{{BUSINESS_ID}}`, `{{THEME_COLOR}}`, `{{WELCOME_MESSAGE}}`, `{{OWNER_NAME}}`, `{{PHONE}}`, `{{BUSINESS_TYPE}}`, `{{SERVICE_AREA}}`, `{{WIDGET_URL}}`

---

## Customer pipeline (currently in DB)

| Customer | Stage | Notes |
|---|---|---|
| Kesia Soares (Camellia Cleaning) | live (preview) | Awaiting domain decision and Google Business Profile setup. Quote form + chat widget deployed. Strategic value: 400+ Brazilian service workers in WhatsApp groups. |
| Gayathri Sankaran (Raaga's Cuisine) | contacted | South Indian restaurant. WordPress site already managed by dev in India. Interested, said she'd check with husband. No follow-through yet. |
| Maggie's Magic Services | candidate | Flyer seen in Eastside community group, no website. Not yet contacted. Plan: build demo with `pristine-home-cleaning` archetype first. |

---

## Outreach status (per repo memory `context.md`, May 23, 2026)

- ~50 cold messages sent across `leads-eastside.csv` and `leads-washington.csv` — **no responses** as of last update
- New lead scraping **paused** — Google Maps surfaces too many businesses with existing websites
- `leads-king-county.csv` (27 leads, pressure washing / garage door / fence+deck) — most have sites; 4 weak leads identified but not committed
- `leads-restaurants.csv` (11 leads) — deprioritized
- `leads-custom-demos.csv` — tracks the prospect-specific demos in `public/sites/`

---

## Subscription tracker (services in use)

| Service | Plan | Monthly | Notes |
|---|---|---|---|
| Render | Starter | $7 | Auto-deploy from GitHub |
| Cloudflare | Free (domain registrar) | ~$0.87 (= $10.46/yr) | `welcomematdigital.com` |
| Cloudflare R2 | Free tier | $0 | Bucket `welcomemat-uploads`, 10GB storage, 10M reads/mo |
| Turso | Free tier | $0 | libSQL hosted DB |
| OpenAI | Free tier (data sharing) | $0 | 2.5M tokens/day on mini models, $10 prepaid credit |
| Resend | Free tier | $0 | 100 emails/day |
| Google Cloud (Places API) | Free $200 credit | $0 | Used for `find-leads.js` and per-business reviews |
| GitHub | Free | $0 | Personal account `sunilmsft` |
| **Total fixed** | | **~$8/mo** | |

Future planned: GitHub Copilot Pro+ ($39/mo) for personal-laptop development.

---

## Database state

Active tables (per `server/db/database.js` and migrations):
- `businesses` — `id`, `name`, `slug`, `system_prompt`, `welcome_message`, `theme_color`, `active`, `owner_name`, `phone`, `business_type`, `service_area`, `plan`, `google_place_id`, `domain`, `domain_registrar`, `domain_cost`, `domain_purchased_at`, `domain_renews_at`, `domain_auto_renew`, `monthly_rate`, `addons`, `client_since`, `billing_notes`, `created_at`
- `conversations` — `id`, `business_id`, `started_at`, `last_message_at`, `message_count`
- `messages` — `id`, `conversation_id`, `role` (user|assistant), `content`, `sent_at`
- `submissions` — populated from `/onboard.html` form
- `customer_pipeline` — admin CRM stages + notes
- `quote_requests` — from `/api/quote`, with token-protected status tracking

### Seeded demo data
On first run, `server/index.js` seeds **"The Plateau Kitchen"** (slug `plateau-kitchen`) with system prompt from `server/prompts/plateau-kitchen.txt`. The corresponding frontend demo page was deleted on May 21 but the seed code remains — see [07_KNOWN_ISSUES.md](07_KNOWN_ISSUES.md).

---

## Git state

- **Branch:** `master` is the only active branch
- **Stale local branches:** `copy-refinement-v1`, `camellia-review-v1` (VS Code merge-base markers in `.git/config`)
- **Remote:** `origin = https://github.com/sunilmsft/frontdesk-ai.git`
- **Commit identity (current):** `Sunil Venugopal <sunil1308@gmail.com>` (set June 14, 2026)
- **Commit identity (historical):** All commits before June 14 use `Sunil Venugopal <sunilve@microsoft.com>`

See `git log --oneline` for full history. Most recent 50 commits are reflected in [05_DECISION_LOG.md](05_DECISION_LOG.md).
