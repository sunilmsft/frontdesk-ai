# 09 — Onboarding (for a new engineer or PM)

> Assumes you have zero prior context. Walks from `git clone` to running locally to making a first change.

---

## Prerequisites

- **Node.js 18+** (https://nodejs.org)
- **Git** (https://git-scm.com)
- A code editor (VS Code recommended — repo has memory tied to GitHub Copilot)
- A **personal GitHub account** added as a collaborator on `sunilmsft/frontdesk-ai`
- Access to the following accounts (provisioned separately, not in repo):
  - Render (for production logs/env vars)
  - Turso dashboard (for DB)
  - OpenAI platform (for API key)
  - Cloudflare (R2 + DNS for welcomematdigital.com)
  - Resend (email)
  - Google Cloud (Places API)

---

## Step 1 — Clone

```bash
git clone https://github.com/sunilmsft/frontdesk-ai.git
cd frontdesk-ai
```

## Step 2 — Install

```bash
npm install
```

## Step 3 — Create `.env`

Copy from `.env.example` and add the missing variables (the example is incomplete — see [04_ARCHITECTURE.md](04_ARCHITECTURE.md) for the full env var table):

```bash
cp .env.example .env
```

Then edit `.env`:

```env
# Required for runtime
OPENAI_API_KEY=sk-...
ADMIN_PASSWORD=pick-something
JWT_SECRET=long-random-string

# Required to connect to production DB
TURSO_URL=libsql://...
TURSO_AUTH_TOKEN=...

# Required for quote email notifications
RESEND_API_KEY=re_...
NOTIFICATION_EMAIL=your-email@example.com
BASE_URL=http://localhost:3001

# Required for Google reviews + lead finder
GOOGLE_PLACES_API_KEY=...

# Required for photo uploads (R2)
CF_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=welcomemat-uploads

# Optional
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=
```

> ⚠️ If you omit `TURSO_URL`, the code falls back to a local SQLite file at `server/db/frontdesk.db`. Fine for poking around; use the cloud DB if you want to see real customer data.

## Step 4 — Run

```bash
npm run dev    # uses node --watch for auto-restart
# or
npm start
```

You should see:

```
🏪 FrontDesk AI v0.1.0
Server:    http://localhost:3001
Demo:      http://localhost:3001
Admin:     http://localhost:3001/admin.html
Widget:    http://localhost:3001/widget/

Demo business: The Plateau Kitchen
Slug: plateau-kitchen
```

## Step 5 — Visit the key URLs

| URL | What you'll see |
|---|---|
| http://localhost:3001/ | WelcomeMat Digital holdco homepage |
| http://localhost:3001/pitch | FrontDesk AI pitch page |
| http://localhost:3001/swoop | Swoop product page |
| http://localhost:3001/site/camellia-cleaning | Camellia Cleaning customer site (if DB has it) |
| http://localhost:3001/demos/ | Demo archetype index |
| http://localhost:3001/onboard | Multilingual onboarding form (EN/PT/ES) |
| http://localhost:3001/admin-login.html | Admin login (use `ADMIN_PASSWORD` from `.env`) |
| http://localhost:3001/admin.html | Admin Command Center (after login) |
| http://localhost:3001/health | JSON health check |

---

## Read these next (in order)

1. **[01_EXECUTIVE_SUMMARY.md](01_EXECUTIVE_SUMMARY.md)** — what this project is
2. **[02_PRODUCT_VISION.md](02_PRODUCT_VISION.md)** — brand DNA, why decisions feel the way they do
3. **[04_ARCHITECTURE.md](04_ARCHITECTURE.md)** — file map, routes, schema, env vars
4. **[03_CURRENT_STATE.md](03_CURRENT_STATE.md)** — what's deployed and live right now
5. **[08_AI_CONTEXT.md](08_AI_CONTEXT.md)** — conventions if you'll be editing AI prompt logic or copy
6. **[05_DECISION_LOG.md](05_DECISION_LOG.md)** — read before proposing major architectural changes
7. **[07_KNOWN_ISSUES.md](07_KNOWN_ISSUES.md)** — footguns and dirty corners
8. **[06_BACKLOG.md](06_BACKLOG.md)** — what's planned

In the project root:
- [README.md](../README.md) — the public-facing overview (outdated in places — see [05_DECISION_LOG.md](05_DECISION_LOG.md))
- [CONTEXT.md](../CONTEXT.md) — historical strategic notes
- [BACKLOG.md](../BACKLOG.md) — the authoritative backlog (this file's `06_BACKLOG.md` consolidates it)
- [SITE-BUILD-PLAYBOOK.md](../SITE-BUILD-PLAYBOOK.md) — how to build a new customer site

---

## Common workflows

### Make a small UI tweak to the Camellia site
1. Edit `public/sites/camellia-cleaning/index.html`
2. Refresh `http://localhost:3001/site/camellia-cleaning`
3. Commit when happy
4. **Wait for explicit "push it" from user** — pushing = production deploy in ~60s

### Add a new demo
1. Pick a vertical (cleaning / tree / etc.)
2. Copy `public/templates/bold-trade/index.html` OR `public/templates/fresh-clean/index.html` OR an existing demo to `public/demos/{new-slug}/index.html`
3. Find-replace: business name, slug, phone, email, areas, hours, photos, colors, services, translations
4. Add card to `public/demos/index.html`
5. Test at `http://localhost:3001/demos/{new-slug}/`

### Add a new customer
See [SITE-BUILD-PLAYBOOK.md](../SITE-BUILD-PLAYBOOK.md). Short version:

1. Collect assets (logo, photos, info) — see playbook pre-build checklist
2. Pick a DNA combo from the 5-axis matrix in [02_PRODUCT_VISION.md](02_PRODUCT_VISION.md)
3. Copy `public/sites/camellia-cleaning/` as starting point
4. Find-replace everything
5. Create system prompt at `server/prompts/{slug}.txt`
6. Create DB row via admin tool or directly:
   ```sql
   INSERT INTO businesses (id, name, slug, system_prompt, welcome_message, theme_color, owner_name, phone, business_type, service_area)
   VALUES (...);
   ```
7. Embed widget on their site (or use `/site/{slug}` as the site)
8. Test full flow: page loads, chat replies, quote form submits, email arrives

### Onboard via the form (preferred for real customers)
1. Send them `https://welcomematdigital.com/onboard`
2. They pick language → fill form → submit
3. You get a browser notification (admin must be logged in)
4. Open admin → Submissions tab → click row
5. Edit fields (use ✨ AI Enhance per field if useful)
6. Click "Generate System Prompt" → review/edit
7. Click "Approve & Create Business" → DB row created, chat live

### Update a system prompt
- Via admin: Business detail view → edit `system_prompt` field
- Via DB: `UPDATE businesses SET system_prompt = ? WHERE slug = ?`
- Test in widget at `/site/{slug}` — open chat, send a representative question

### Add a Google reviews integration to a customer site
1. Find their Place ID (use `tools/check-camellia-place-id.js` as reference, or via Google's Place ID Finder)
2. `UPDATE businesses SET google_place_id = '...' WHERE slug = ?`
3. Test `/api/reviews/{slug}` — should return their reviews
4. The site template renders them in the "What Our Clients Say" section

---

## Common pitfalls (read these BEFORE your first push)

### "Push" means production
`git push origin master` = Render rebuilds and redeploys to https://welcomematdigital.com within ~60 seconds. There is no staging. **Always run locally first, get user confirmation, then push.**

### `.env.example` is incomplete
Don't assume the four documented vars are all you need. See [04_ARCHITECTURE.md](04_ARCHITECTURE.md) for the full list, or you'll hit `undefined` errors at random spots.

### `JWT_SECRET` defaults to a known string
If you forget to set it in production, every admin JWT is forgeable. Always set it.

### Adding a column to `businesses` requires editing `db/database.js`
There's no migration tool. Add an entry to the `migrationCols` array in `server/db/database.js`. The next startup will ALTER TABLE.

### The widget uses **slug**, not UUID
The script tag uses `data-business="some-slug"`. The API internally resolves to ID. Confusing the two = silent failure.

### Single global `NOTIFICATION_EMAIL`
Every quote email goes to the same address regardless of which business. Will become wrong at customer #2.

### Demo cross-pollination
When copying a demo template, **read every line for stale references** (wrong business name, wrong service words, wrong emoji). This has bitten the project multiple times.

### The Plateau Kitchen seed
`server/index.js` seeds a "Plateau Kitchen" business on first run even though that frontend page is deleted. Harmless but confusing.

### `render.yaml` says `plan: free` but production is on Starter ($7)
If Render ever resyncs from yaml, the plan downgrades. Don't trust `render.yaml`'s `plan` field.

---

## How to interact with the user

Per the user's stated preferences (in repo memory `/memories/`):

- **Prefer simplicity.** No over-engineering.
- **State LOCAL vs PUSHED** after every change.
- **High autonomy:** show plan, build, let them review. Don't ask permission for every small step.
- **Don't auto-push** — wait for explicit "push it" / "yes push"
- **Use `welcomematdigital.com`** in URLs, never the Render subdomain
- **Update memory** after each milestone
- The user is a **Microsoft PM**, not a senior engineer — suggest simplest working solution
- API keys exposed in chat = **warn to regenerate immediately**

---

## Where to ask for help

There is no team. The repo memory file `/memories/repo/welcomemat-playbook.md` is the master strategic doc. This `/docs/` folder is the master technical doc. If both fall short, the only authoritative source is the running code and git history.
