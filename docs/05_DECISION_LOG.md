# 05 — Decision Log

> Why things are the way they are. Each decision lists what was decided, when, why, and what was considered. Sourced from `CONTEXT.md`, `BACKLOG.md`, repo memory, and git history.

---

## Foundational decisions (Q2 2026)

### LLM provider: OpenAI GPT-4o-mini
- **When:** Settled by early May 2026
- **Why:** Cheapest token cost on a capable instruction-following model with multilingual response quality. Free tier (2.5M tokens/day) covers all pilot traffic.
- **Path considered:** Claude (Anthropic) → Gemini Flash → **OpenAI GPT-4o-mini** ← settled
- **Trade-off accepted:** Single shared API key across all customers. Per-customer cost attribution requires the `user`/`metadata` tagging change still in backlog.

### Database: Turso (libSQL)
- **When:** Migration completed May 2026 (per `welcomemat-playbook.md` infra checklist marked done)
- **Why:** Render free/Starter ephemeral disks would lose SQLite data on every redeploy or restart
- **Path considered:** PostgreSQL on Render, Supabase, **Turso libSQL** ← chosen
- **Why Turso specifically:** SQLite-compatible API (drop-in for the existing code), free tier sufficient, S3-backed durability, no schema migration tooling needed
- **Trade-off accepted:** `better-sqlite3` still in `package.json` (dead dependency). No formal migration tool — relies on idempotent ALTER pattern in `db/database.js`

### Hosting: Render
- **When:** Free tier early, upgraded to Starter ($7/mo) after Render cold-start became visible to customers (~15-min idle spin-down was unprofessional)
- **Why:** GitHub auto-deploy from `master` with zero config; minimal Node operations
- **Path considered:** Vercel (rejected — long-running Node server needed), Fly.io, Railway
- **Trade-off:** No staging environment. `git push` = production. See [07_KNOWN_ISSUES.md](07_KNOWN_ISSUES.md).

### Frontend: Vanilla HTML/CSS/JS
- **When:** Day one
- **Why:** Zero build step keeps deploy simple, sites stay fast for SMB customers on cheap phones, and AI assistants can edit any file directly without framework overhead.
- **Trade-off:** Per-customer site files are full HTML duplicates. Scaling past 5 customers triggers a config-driven template phase (see "Templatization Phases" in playbook).

---

## Brand & product decisions

### Brand evolution: FrontDesk AI → WelcomeMat (May 19, 2026)
- **Original product framing:** "AI chat widget for local businesses"
- **Insight:** The landing page **is** the product. The widget is the wrapper.
- **Decision:** Rename umbrella brand to WelcomeMat. FrontDesk AI becomes the chat-widget component name (internal). Public face is "Welcome Mat Digital LLC."
- **Considered also:** "Front & Center" as LLC name (rejected — less memorable, less concrete)

### Pricing redesign: tiers → flat + setup (May 22, 2026)
- **Old:** Widget Only $29 / Landing Page $59 / Full Package $99 (SaaS-tiered)
- **New:** Flat **$59/mo** + one-time **$149** (website setup) or **$299** (above + booking)
- **Why changed:**
  - SaaS tier comparison doesn't match a concierge service model
  - Target audience (immigrant SMB owners) defaults to cheapest, ignoring feature comparison
  - Scheduling/booking is a better differentiator than custom domain
- **Status:** Pricing **not enforced in code** — Stripe integration not built. Free pilots still active.

### Twilio Toll-Free Verification compliance theater (May 28 – June 14, 2026)
- **Context:** Swoop (the missed-call SaaS) was twice rejected by Twilio for TFV. Rejection #2 cited "Brand Identity Mismatch" — Gmail domain, no real Swoop product page, opt-in not branded.
- **Decision (May 28):** Restructure homepage as WelcomeMat Digital holdco with FrontDesk AI + Swoop as products. Build real Swoop product page, privacy, and terms on welcomematdigital.com.
- **Decision (June 4):** Add standalone `/swoop/consent.html` per Twilio Huvi feedback
- **Decision (June 14):** Strengthen `/swoop/privacy.html` no-share language for SMS opt-in / mobile info per Twilio compliance guidance (commit `5e3dc3c`)
- **All shipped.** TFV resubmission status: see Swoop project notes (separate repo).

---

## Product mechanics decisions

### Multilingual is first-class, not an afterthought
- **Decision:** Every visible text element gets `data-i18n` attribute from the start. EN authoring, ES + PT translations built in parallel.
- **Why:** Target audience often immigrant-owned, and customers of those businesses often non-English speakers. Multilingual is the **brand differentiator** vs. Wix/Squarespace.
- **Mechanism:** Chat widget tracks `currentLang` via custom `frontdesk-lang-change` event dispatched by the page → sends `lang` param to `/api/chat` → server injects language instruction into system prompt.

### Guardrail clause on every system prompt
- **Decision:** Append a universal `IMPORTANT GUARDRAIL` clause to every system prompt (see `server/routes/chat.js`)
- **Why:** Prevents the AI from going off-topic (weather, trivia, coding help) which would burn tokens and look unprofessional
- **Text:** Politely redirects: *"Great question, but I'm really only set up to help with {business.name}-related questions!"*

### Inject current date/time into prompt
- **Decision:** Always prepend "Current date and time: …" to system prompt before sending to OpenAI
- **Why:** Without this, the AI hallucinates day-of-week when asked "are you open today?"

### Pricing in concierge language, not feature checklists
- **Decision (May 22):** Marketing copy lists outcomes ("We keep everything updated — just text us") not features ("Includes 200 conversations/month")
- **Why:** Target audience translates feature lists into "what's the cheapest option?" — outcomes resist commodity comparison

### Plateau Kitchen demo removed (May 21, 2026)
- **What:** The original demo restaurant homepage at `/` was retired when the WelcomeMat holdco homepage took over `/`
- **Caveat:** The DB seeding code in `server/index.js` still creates the `plateau-kitchen` business row on first run. The frontend page is gone but the DB record persists. See [07_KNOWN_ISSUES.md](07_KNOWN_ISSUES.md).

### Demo cap: 2 demos per vertical until paying customer in that vertical
- **Decision (May 21):** Stop building speculative demos
- **Why:** Without a real customer for a vertical, demos are spec work with no signal. Kesia's actual site sells better than ten mock-ups.
- **Tension:** Currently 17 demos exist (most pre-dated this rule). Future builds gated.

### Sales motion: "Show, don't pitch"
- **Decision:** Send live preview URLs as cold outreach, not PDF proposals
- **Why:** Web agency comparison — they all send PDFs. Living preview = instant credibility.
- **Implementation:** `tools/spin-demo.js` generates a trade-themed preview in ~30s from a Google listing

### Growth via referral, not paid acquisition
- **Decision (May 21):** Focus on the "Kesia flywheel" — one happy customer in a community → personal endorsement to 400+ Brazilian cleaners → 2-3 convert → they share in *their* networks
- **Why:** SMB services grow through word-of-mouth, not ads. Paid acquisition requires LTV economics not yet proven.

---

## Technical decisions

### JWT auth for admin (May 2026)
- **Before:** Admin routes were open — anyone with the URL could access
- **Decision:** JWT with 7-day expiry. Single admin password from `ADMIN_PASSWORD` env.
- **Limit:** No user/role system. Single admin. Acceptable for current scale.

### Resend over SendGrid / SES for email
- **Why:** Free tier 100/day is sufficient. Modern DX. No domain warming required for low volume.
- **Limit:** Currently sends from `onboarding@resend.dev` (Resend sandbox sender). Custom-domain sending pending DNS setup of `welcomematdigital.com` MX records.

### Cloudflare R2 over S3 for photo uploads
- **Why:** Free tier 10GB storage + 10M reads/mo. Zero egress fees.
- **Trade-off:** R2 buckets stay private — images served via `/api/upload/photos/...` proxy through Express.

### Cloudflare Web Analytics over GA4
- **When:** Added June 3, 2026 (commit `a1e4b54`)
- **Why:** Privacy-preserving, no cookie banner needed, server-side beacon. GA4 felt heavy for the scale.
- **How:** PowerShell script `tools/inject-cf-beacon.ps1` adds the beacon to all public pages.

### Custom domain routing in Express, not Render edge
- **Decision:** Match `req.hostname` in app code, look up `businesses.domain`, rewrite URL
- **Why:** Render's custom domain feature requires per-domain config in dashboard; this lets customers self-onboard a domain by just updating DNS + DB row.
- **Trade-off:** Each custom domain still needs to be added in Render's dashboard for SSL cert provisioning (Let's Encrypt via Render). The routing logic alone isn't enough.

### Single global `NOTIFICATION_EMAIL` for quote requests
- **Status:** Acknowledged limitation. Per-business owner email is in [06_BACKLOG.md](06_BACKLOG.md).
- **Why deferred:** Only 1 customer using the form. Will hurt at customer #2+.

---

## Process / operational decisions

### Auto-push policy (after May 21 violation)
- **Rule:** Never auto-push to remote. Render auto-deploys from `master`, so `git push` = instant production.
- **Flow:** make changes → commit locally → user reviews on localhost → user says "push it" → THEN push.
- **Always state LOCAL vs PUSHED:** After any change, explicitly tell the user whether it's local-only or pushed.

### Always use welcomematdigital.com in user-facing URLs
- **Rule:** Never share raw `frontdesk-ai-vx1s.onrender.com` URL with customers or in pitches
- **Why:** Branded domain = professional. Render subdomain = "this is a side project."

### Single source of truth: repo memory `welcomemat-playbook.md`
- **Decision:** All strategy, brand, ops, GTM, tech, pricing lives in `/memories/repo/welcomemat-playbook.md` (assistant memory) and is mirrored into the in-repo `docs/` (this folder) for permanence.
- **Why:** AI assistants can lose memory; docs in repo survive.

---

## Decisions explicitly *deferred*

| Decision | When to revisit |
|---|---|
| Per-business OpenAI usage attribution (user/metadata tagging) | Before customer #3 |
| OpenAI account-wide hard cap ($100/mo) + scoped FrontDesk project ($20/mo) | Before first cold-traffic spike |
| Migrate workspace location off OneDrive (personal vault) | Not urgent — OneDrive is personal account, not corp |
| Rewrite git history to remove `sunilve@microsoft.com` from old commits | Optional. Add MS email as verified secondary on personal GitHub as cheaper alternative. |
| Rename GitHub repo to drop `sunilmsft` branding | After first paying customer, if at all |
| Stripe integration | After 3+ customers verbally committed to paying |
| Config-driven site template (Phase 1 templatization) | At customer #3 |
| Self-serve onboarding with AI-generated sites (Phase 3) | At customer #25+ |
| Logo generation add-on (DALL-E) | When a customer asks |
| Annual plans / free tier | After pricing validated by ≥3 paying customers |
| Business owner dashboard | At 10+ businesses |
| Provider-agnostic LLM (swap models via config) | Only if OpenAI cost spikes |

---

## Recent commit history (last 50, oldest → newest at top)

| Hash | Date | Summary |
|---|---|---|
| 6791552 | 2026-05-21 | backlog: add onboarding form enhancements section |
| 5ab706f | 2026-05-22 | Redesign pitch.html: Phase 1 messaging refresh + service-oriented pricing |
| 3bd2cd8 | 2026-05-22 | Add 7 demo archetypes + updated backlog |
| d1a4ce0 | 2026-05-22 | Add /contact page — multilingual lead capture form |
| 869891c | 2026-05-22 | pitch.html: add About + nav links + clean header |
| b28f5d9 | 2026-05-22 | add lead finder tools, demo site generator, Tree Service By Northwest demo |
| df81aa6 | 2026-05-22 | add demo preview banner to generated sites |
| 9e49564 | 2026-05-22 | Add fresh-clean template, hero images for all trades, 4 new demos |
| f6b35c4 | 2026-05-22 | Slim personalized preview banner, hero images for bold-trade |
| a47e4aa | 2026-05-22 | Add status column to leads CSV |
| 954d13f | 2026-05-22 | Sort leads CSV by review count descending |
| 72b16a6 | 2026-05-22 | Add Washington-wide leads (23 businesses) |
| 2393ccd | 2026-05-22 | Add 7 category demos, new demos index |
| e8fe7e0 | 2026-05-22 | Enable chat widget on all category demos |
| 6a3bc9d | 2026-05-22 | Add personalized previews section to demos index |
| 2e275ea | 2026-05-22 | Add tree service archetype demo |
| 85f116c | 2026-05-22 | Add landscaping archetype + polish both demos |
| cacd3b7 | 2026-05-23 | Redesign demos index for cold visitors |
| 62897bd | 2026-05-23 | Add restaurant card to demos index |
| cb109e3 | 2026-05-23 | Fix broken locksmith hero image |
| 67e5764 | 2026-05-23 | Fix locksmith CTA copy |
| 0d849e7 | 2026-05-23 | Fix cross-pollination of copy between demos |
| a8ac1d3 | 2026-05-23 | Locksmith hero swap; add chat widget to 7 missing pages |
| e44fe16 | 2026-05-23 | Add 11 restaurant leads for Eastside outreach |
| 46280a2 | 2026-05-23 | Camellia: fix widget slug, add prompt file |
| afa68a4 | 2026-05-23 | Switch all demo pages from plateau-kitchen widget to generic |
| c11a4e3 | 2026-05-23 | Add location bias to Google Places search |
| 790f7c6 | 2026-05-23 | Add king-county leads CSV |
| 191701e | 2026-05-23 | Add Madras Dosa Corner demo |
| f1e0ddc | 2026-05-23 | Add Simply Indian demo + custom demos tracking CSV |
| da85f8b | 2026-05-23 | Add Southern Spice demo |
| ab97e82 | 2026-05-27 | Permanent manual Place ID flow for Google reviews |
| efb3e3c | 2026-05-27 | Resolve short Google Maps URLs to Place IDs |
| ce04fd5 | 2026-05-27 | Handle hex-format Place IDs |
| ba2d8e0 | 2026-05-28 | Add Camellia testimonial fallback |
| 39f5dda | 2026-05-28 | Show curated testimonials when Google returns no reviews |
| 3d95cdb | 2026-05-28 | Remove curated review cards; show Google-only state |
| a68dea3 | 2026-05-28 | Upgrade Camellia CTA icons to Lucide badges |
| db9c9ca | 2026-05-29 | feat: WelcomeMat Digital holdco homepage + Swoop product page + privacy + terms |
| 6ee5943 | 2026-05-29 | Clearer products section + remove redundant nav CTA |
| 04c1f32 | 2026-05-29 | feat: add SMS consent policy at /swoop/consent.html for Twilio TFV |
| 144f5b2 | 2026-05-29 | Polish: WelcomeMat link in swoop subpage nav/footers |
| 64127df | 2026-05-29 | Copy: no-commitment reassurance under hero CTA on /swoop |
| cb25007 | 2026-05-29 | Copy: drop "headache"; try-free reassurance under hero tagline |
| 71a2cfc | 2026-05-29 | Style: widen homepage hero |
| 2fa0220 | 2026-06-02 | Add Studio Miel salon demo + editorial redesign |
| 256e0ab | 2026-06-02 | Wire Camellia Cleaning 3 customer reviews into manual fallback |
| a1e4b54 | 2026-06-03 | Add Cloudflare Web Analytics beacon to all public pages |
| c78ccc2 | 2026-06-04 | Swoop consent: add standalone Opt-In Flow section (Twilio Huvi feedback) |
| 5e3dc3c | 2026-06-14 | privacy: add explicit no-share clause for SMS opt-in / mobile info per Twilio compliance guidance |

For full history: `git log --pretty=format:"%h | %ad | %s" --date=short`
