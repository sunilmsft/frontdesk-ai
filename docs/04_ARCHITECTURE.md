# 04 — Architecture

> Mapped from `server/index.js`, `server/routes/*.js`, `server/db/database.js`, `server/middleware/auth.js`, `package.json`, and `render.yaml`. No inferred behavior.

---

## High-level diagram

```
                       ┌─────────────────────────────┐
                       │  Customer's browser         │
                       │  (visits a site or admin)   │
                       └─────────────┬───────────────┘
                                     │
                                     ▼  HTTPS
                       ┌─────────────────────────────┐
                       │  Render Starter (always-on) │
                       │  Node 18+ / Express 5       │
                       │  server/index.js            │
                       └─────────────┬───────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
       ┌─────────────┐        ┌────────────┐        ┌──────────────┐
       │ Turso       │        │ OpenAI API │        │ Resend API   │
       │ (libSQL DB) │        │ gpt-4o-mini│        │ (quote email)│
       └─────────────┘        └────────────┘        └──────────────┘
              │                      │
              │                      │
              ▼                      ▼
       ┌─────────────┐        ┌────────────┐
       │ Cloudflare  │        │ Google     │
       │ R2 (S3 API) │        │ Places API │
       │ uploads     │        │ reviews    │
       └─────────────┘        └────────────┘
```

---

## Folder structure (annotated)

```
frontdesk-ai/
├── server/
│   ├── index.js                  # Express entry — routes, custom domain logic, seed Plateau Kitchen
│   ├── db/
│   │   └── database.js           # Turso client + schema init + safe ALTER migrations
│   ├── middleware/
│   │   └── auth.js               # JWT verify + token generator
│   ├── prompts/
│   │   ├── camellia-cleaning.txt # System prompt for Kesia's site (Portuguese-aware)
│   │   └── plateau-kitchen.txt   # System prompt for seeded demo restaurant
│   └── routes/
│       ├── chat.js               # POST /api/chat — OpenAI call with guardrail + i18n injection
│       ├── admin.js              # All /api/admin/* — JWT-protected
│       ├── upload.js             # /api/upload — multer + R2
│       ├── reviews.js            # /api/reviews — Google Places + manual fallback
│       ├── quote.js              # /api/quote — Resend email + token-protected detail page
│       ├── contact.js            # /api/contact — landing-page contact form with OpenAI translation
│       └── site.js               # /site/:slug — template variable injection
│
├── public/                       # Static assets — served via express.static
│   ├── index.html                # WelcomeMat Digital holdco homepage
│   ├── pitch.html                # FrontDesk AI pitch page (also at /pitch, /frontdesk)
│   ├── admin.html                # Admin Command Center UI
│   ├── admin-login.html
│   ├── onboard.html              # Multilingual onboarding form
│   ├── contact.html              # Lead capture form
│   ├── pick-color.html           # Color picker tool
│   ├── playbook.html             # Internal playbook
│   ├── stack-101.html            # Stack overview
│   ├── robots.txt                # Blocks admin/internal pages
│   ├── sitemap.xml
│   │
│   ├── widget/
│   │   └── frontdesk-widget.js   # Embeddable chat widget
│   │
│   ├── sites/                    # Per-customer landing pages
│   │   ├── camellia-cleaning/    # LIVE
│   │   ├── aloha-junk-removal/
│   │   ├── bigfoot-tree-care/
│   │   ├── d-k-carpet-floor-cleaning-and-repairs-llc/
│   │   ├── legacy-services-carpet-cleaning-llc/
│   │   └── tree-service-by-northwest/
│   │
│   ├── demos/                    # Archetype demos (cleaning, tree, restaurant, etc.)
│   │   ├── index.html            # Demos landing/index
│   │   ├── ARCHETYPE-SUMMARY.md
│   │   ├── REVIEW-GUIDE.md
│   │   └── {slug}/               # ~17 demos
│   │
│   ├── templates/                # Reference templates for new builds
│   │   ├── bold-trade/           # Sharp, slab, dark, phosphor icons
│   │   └── fresh-clean/          # Editorial cleaning template
│   │
│   └── swoop/                    # Swoop product marketing surface
│       ├── index.html            # Hero, problem, how-it-works, pricing
│       ├── privacy.html          # SMS Privacy Policy (Twilio TFV)
│       ├── terms.html            # Terms of Service
│       └── consent.html          # Standalone Opt-In Flow page
│
├── tools/                        # CLI utilities (not deployed)
│   ├── find-leads.js             # Google Places lead scraper → CSV
│   ├── gen-texts.js              # Add personalized outreach messages as CSV column
│   ├── spin-demo.js              # Generate trade demo from Google listing in ~30s
│   ├── leads-*.csv               # Lead lists by region/vertical
│   ├── check-camellia-place-id.js # One-off Google Place ID lookup
│   ├── inject-cf-beacon.ps1      # PowerShell — add Cloudflare Web Analytics to pages
│   ├── logo-export.html          # Logo design helper
│   ├── promo-graphic.html
│   ├── promo-pilot.html
│   ├── promo-v2.html
│   └── screenshot.js
│
├── docs/                         # ← THIS DOCUMENTATION
│
├── BACKLOG.md
├── CONTEXT.md
├── README.md
├── SITE-BUILD-PLAYBOOK.md
├── render.yaml                   # Render service config
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── named place-id-finder.html    # Standalone tool (unclear if still used)
```

---

## Express route table

| Method | Path | File | Auth | Description |
|---|---|---|---|---|
| GET | `/` | `server/index.js` | none | Custom-domain aware — platform host serves `public/index.html`, custom host serves `/site/{slug}` |
| GET | `/health` | `server/index.js` | none | `{ status: 'ok', timestamp }` |
| GET | `/onboard`, `/pitch`, `/frontdesk`, `/swoop`, `/contact` | `server/index.js` | none | Clean URLs for static pages |
| GET | `/site/:slug` | `routes/site.js` | none | Renders business landing page with template variable injection |
| POST | `/api/chat` | `routes/chat.js` | none (rate-limited by length) | Chat completion — returns `{ conversationId, reply }` |
| POST | `/api/quote` | `routes/quote.js` | none | Submit quote → email + DB row |
| GET | `/quote/:id` | `routes/quote.js` | token (`?t=`) | Token-protected detail page |
| PATCH | `/api/quote/:id/status` | `routes/quote.js` | token (`?t=`) | Update status |
| POST | `/api/contact` | `routes/contact.js` | none | Lead capture, OpenAI translates non-EN |
| POST | `/api/upload` | `routes/upload.js` | (none in code) | Multipart → R2 |
| GET | `/api/upload/photos/:slug/:filename` | `routes/upload.js` | none | Proxy R2 object |
| GET | `/api/reviews/:slug` | `routes/reviews.js` | none | Google Places reviews + manual fallback |
| POST | `/api/admin/login` | `routes/admin.js` | none | Returns JWT |
| `*` | `/api/admin/*` (all others) | `routes/admin.js` | JWT | CRUD, stats, AI enhance, prompt generation, pipeline updates |

---

## Database schema (Turso / libSQL)

### businesses
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL | |
| slug | TEXT UNIQUE NOT NULL | Used in widget `data-business`, URLs |
| system_prompt | TEXT NOT NULL | Full LLM system prompt |
| welcome_message | TEXT | Default greeting (`Hi! How can I help you today?`) |
| theme_color | TEXT | Default `#0d9488` |
| active | INTEGER | Default 1 |
| created_at | TEXT | `datetime('now')` |
| owner_name | TEXT | |
| phone | TEXT | |
| business_type | TEXT | |
| service_area | TEXT | |
| plan | TEXT | Default `chat-only` |
| google_place_id | TEXT | For reviews integration |
| domain | TEXT | Custom domain (drives `/` routing) |
| domain_registrar | TEXT | |
| domain_cost | TEXT | |
| domain_purchased_at | TEXT | |
| domain_renews_at | TEXT | |
| domain_auto_renew | INTEGER | Default 0 |
| monthly_rate | TEXT | |
| addons | TEXT | Default `'[]'` (JSON-encoded) |
| client_since | TEXT | |
| billing_notes | TEXT | |

### conversations
`id` (TEXT PK), `business_id` FK, `started_at`, `last_message_at`, `message_count`.

### messages
`id` (AUTOINCREMENT PK), `conversation_id` FK, `role` (`user`|`assistant`), `content`, `sent_at`.

### submissions, customer_pipeline, quote_requests
Created via the same `safe ALTER` migration pattern. Quote requests include `view_token` for token-protected access.

**Migration pattern** (per `server/db/database.js`):
```js
const migrationCols = [
  ['businesses', 'owner_name', 'TEXT'],
  ['businesses', 'phone', 'TEXT'],
  // ...
];
```
Each is added in a try/catch so duplicate ALTERs are safe. **No formal migration tool.**

---

## Environment variables

From `.env.example` + runtime references in code:

| Variable | Required | Used by | Default |
|---|---|---|---|
| `OPENAI_API_KEY` | **Yes** | `routes/chat.js`, `routes/admin.js`, `routes/contact.js` | — |
| `PORT` | No | `server/index.js` | `3001` |
| `NODE_ENV` | No | `server/index.js` | `development` |
| `ALLOWED_ORIGINS` | No | `server/index.js` CORS | `*` in dev |
| `TURSO_URL` | No (defaults to local file) | `db/database.js` | `file:server/db/frontdesk.db` |
| `TURSO_AUTH_TOKEN` | If using Turso cloud | `db/database.js` | — |
| `ADMIN_PASSWORD` | **Yes** (for admin login) | `routes/admin.js` | — |
| `JWT_SECRET` | **Yes** in prod | `middleware/auth.js` | `change-me-in-production` |
| `RESEND_API_KEY` | For quote emails | `routes/quote.js`, `routes/contact.js` | — |
| `NOTIFICATION_EMAIL` | For quote emails | `routes/quote.js`, `routes/contact.js` | — |
| `BASE_URL` | For quote view links | `routes/quote.js` | `https://welcomematdigital.com` |
| `GOOGLE_PLACES_API_KEY` | For reviews + lead finder | `routes/reviews.js`, `tools/find-leads.js` | — |
| `CF_ACCOUNT_ID` | For R2 | `routes/upload.js` | — |
| `R2_ACCESS_KEY_ID` | For R2 | `routes/upload.js` | — |
| `R2_SECRET_ACCESS_KEY` | For R2 | `routes/upload.js` | — |
| `R2_BUCKET_NAME` | For R2 | `routes/upload.js` | `welcomemat-uploads` |

> **`.env.example` only documents the OpenAI key + PORT/NODE_ENV/ALLOWED_ORIGINS.** Other variables are required at runtime but undocumented. This is a documentation gap; see [07_KNOWN_ISSUES.md](07_KNOWN_ISSUES.md).

---

## Render service config (`render.yaml`)

```yaml
services:
  - type: web
    name: frontdesk-ai
    runtime: node
    plan: free          # ← per file. Actual current plan is Starter ($7).
    buildCommand: npm install
    startCommand: node server/index.js
    envVars:
      - key: OPENAI_API_KEY
        sync: false
      - key: NODE_ENV
        value: production
```

> ⚠️ `render.yaml` says `plan: free` but the Render dashboard runs Starter ($7/mo) per the playbook. The YAML is out of sync with reality. Render envVars beyond OpenAI key are set manually in the dashboard.

---

## Package dependencies (`package.json`)

```json
"@aws-sdk/client-s3":  "^3.1051.0",   // Cloudflare R2 uploads
"@libsql/client":      "^0.17.3",     // Turso DB
"better-sqlite3":      "^12.10.0",    // LEGACY — used in older code path?
"cors":                "^2.8.6",
"dotenv":              "^17.4.2",
"express":             "^5.2.1",
"jsonwebtoken":        "^9.0.3",      // JWT admin auth
"multer":              "^2.1.1",      // File upload parsing
"openai":              "^4.73.0"
```

> ⚠️ `better-sqlite3` is in dependencies but no longer used in the runtime code path (DB layer fully switched to Turso). Safe to remove after verification.

Scripts:
```json
"start": "node server/index.js",
"dev":   "node --watch server/index.js",
"check:camellia-place": "node tools/check-camellia-place-id.js"
```

Node engines: `>=18.0.0`. License: MIT.

---

## Data flow — Chat message

1. Customer types in widget → `POST /api/chat` with `{ businessId, conversationId?, message, lang }`
2. `chat.js` looks up business by `id`, rejects inactive
3. Creates `conversations` row if no `conversationId`
4. Logs user message to `messages`
5. Loads last 20 messages from this conversation
6. Builds system prompt: business `system_prompt` + date/time context + language instruction (if non-EN) + universal guardrail clause
7. Calls `openai.chat.completions.create(...)` with `gpt-4o-mini`
8. Logs assistant reply to `messages`
9. Returns `{ conversationId, reply }`

---

## Data flow — Quote submission

1. Customer fills modal on site → `POST /api/quote`
2. `quote.js` validates phone (10–15 digits), looks up business by slug
3. Inserts `quote_requests` row with random `view_token`
4. Builds branded HTML email (matches site palette, includes Call/Text Back buttons + token-protected detail link)
5. Sends via Resend `https://api.resend.com/emails`
6. Returns success to widget

---

## Data flow — Custom domain resolution

1. Request hits Render with `Host: camelliacleaning.com`
2. `isPlatformHost(req)` checks against `PLATFORM_HOSTS` allow-list
3. Not in list → query `businesses.domain = ? OR domain = www.?`
4. If match → rewrite `req.url` to `/site/{slug}` and call `next()`
5. `routes/site.js` handles the rewritten path → injects template variables → serves `public/sites/{slug}/index.html`

---

## What is NOT in this codebase (intentionally)

- No payment processing (Stripe not integrated)
- No SMS sending (Swoop's missed-call text-back lives in a separate repo)
- No customer login (only admin login)
- No CI/CD beyond Render's GitHub auto-deploy
- No tests
- No build step / bundler — pure static + Node
- No Docker
- No formal migration system
- No monitoring/observability beyond Cloudflare Web Analytics beacon (added June 3)
