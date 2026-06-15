# 06 — Backlog

> Consolidated from `BACKLOG.md` and repo memory. Grouped by status and priority. Source documents remain authoritative; this is a snapshot.

---

## ✅ Completed (verified in code + git)

### Infrastructure
- [x] Deploy to production (Render, auto-deploys from GitHub master)
- [x] Migrate SQLite → Turso (libSQL cloud)
- [x] Admin auth via JWT
- [x] Cloud file storage — Cloudflare R2 with private bucket + Express proxy
- [x] Google Search Console: welcomematdigital.com verified + sitemap submitted (May 20)
- [x] Cloudflare Web Analytics beacon on all public pages (June 3)

### Product
- [x] Onboarding form with EN / PT / ES language gate, brand color picker, 3 tone presets
- [x] Submission → Pipeline auto-create at "submitted" stage
- [x] Admin Command Center: stats, businesses, conversations, submissions, pipeline tracker
- [x] AI Enhance per-field on admin review
- [x] AI Generate Prompt from edited form data
- [x] Pipeline 12-stage CRM (lead → live)
- [x] Multilingual chatbot (auto-responds in customer's language)
- [x] Chat widget with theme color, SVG icons, animations, language sync
- [x] Theme presets + auto-detect brand color from website
- [x] Quote intake form (multi-step modal, per-service dynamic questions, EN/PT/ES)
- [x] Quote email notifications via Resend (Call/Text Back buttons, view details link)
- [x] Quote status tracking (token-protected detail page, PATCH API, new → contacted → quoted → booked → closed)
- [x] Phone formatting + 10-digit validation (client + server)
- [x] robots.txt cleanup (block admin/internal pages)
- [x] Custom domain routing in Express (`businesses.domain` lookup)
- [x] Google Places reviews integration with 24h cache + manual fallback per slug
- [x] Place ID resolution: handle short URLs + hex-format
- [x] Admin Google Place ID picker (search/preview/connect/disconnect)
- [x] Client dashboard tab in admin (domain, plan, billing, add-ons per business)

### Marketing surface
- [x] WelcomeMat Digital holdco homepage at `/` (May 29)
- [x] Swoop product page at `/swoop` with hero, problem, how-it-works, $19 Founding 5 pricing, mailto signup, compliance callout
- [x] Swoop SMS Privacy Policy at `/swoop/privacy.html` (call-as-consent, STOP/HELP, Twilio + OpenAI data flow, retention)
- [x] Swoop Terms of Service at `/swoop/terms.html` (acceptable use, SHAFT exclusions, founding pricing, WA governing law)
- [x] Swoop SMS Consent policy at `/swoop/consent.html` (Twilio TFV — May 29)
- [x] Swoop privacy hardening for SMS opt-in / mobile info no-share clause (June 14, commit `5e3dc3c`)
- [x] FrontDesk pitch page at `/pitch` and `/frontdesk` (Phase 1 refresh May 22)
- [x] Contact page at `/contact` with multilingual lead capture
- [x] 17 demo archetypes under `/demos/`
- [x] 2 reference templates (`bold-trade`, `fresh-clean`)
- [x] Copy de-tech pass — replaced "software/tools/dashboards/AI-powered/platform" with trade-relatable language

### Tooling
- [x] `tools/find-leads.js` — Google Places lead scraper to CSV
- [x] `tools/gen-texts.js` — auto-add personalized outreach messages as CSV column
- [x] `tools/spin-demo.js` — generate trade-specific demo from Google listing in ~30s
- [x] `tools/inject-cf-beacon.ps1` — bulk-add Cloudflare Web Analytics beacon

---

## 🔥 Active priorities (next 2 weeks)

### Close the first paying loop (Kesia → live customer)
- [ ] Kesia picks domain → purchase via Cloudflare → configure DNS → add to Render
- [ ] Google Business Profile setup (service area business, house cleaning category)
- [ ] Wait for verification postcard → enter PIN
- [ ] Wire live Google reviews onto her site (replace manual fallback)
- [ ] Provide her a review-request link/template she can text clients

### Twilio TFV resubmission (Swoop blocker)
- [ ] Use updated `/swoop/privacy.html` + `/swoop/consent.html` to resubmit Twilio TFV form
- [ ] Wait on Twilio decision

### Outreach push (free 3-pilot strategy from June 2 plan)
- [ ] Finalize FB post copy ("3 Eastside small businesses…" scarcity pitch — drafted June 2 in chat, **not yet ported into the repo**)
- [ ] Rewrite "MS PM credibility" line in outreach copy (since user has flagged MS migration concerns)
- [ ] Post in 2-3 Eastside FB groups (Sammamish/Issaquah/Bellevue community, Eastside Moms)
- [ ] Skip generic "Promote Your Business" groups — full of other marketers
- [ ] Build Maggie's Magic Services demo (first pilot candidate) using `pristine-home-cleaning` archetype
- [ ] Cap intake at 3, rest go on waitlist

---

## 🛡️ Hardening (defensive — do AFTER pilot signups)

- [ ] Per-customer OpenAI usage tagging: add `user: biz_<slug>` + `metadata: { business_slug }` to `openai.chat.completions.create` in `server/routes/chat.js`
- [ ] OpenAI dashboard: account-wide hard cap $100/mo + $50 email alert at `platform.openai.com/account/billing/limits`
- [ ] OpenAI dashboard: scoped project for FrontDesk with $20/mo cap + dedicated API key; update Render env
- [ ] Regenerate ALL secrets exposed in chat May 21 (Turso token, JWT secret, admin password, R2 keys, Google API key, Resend key — see [07_KNOWN_ISSUES.md](07_KNOWN_ISSUES.md))
- [ ] Add rate limiting for production beyond in-memory map
- [ ] Restrict `ALLOWED_ORIGINS` per business (currently `*` in dev, single env var in prod)

---

## 📋 Onboarding form enhancements

- [ ] Contact channel picker — let owner choose which CTAs appear (Quote Form / Text / WhatsApp / Call); site builder renders only chosen
- [ ] Per-business notification email — store owner email; route quote notifications to them instead of global `NOTIFICATION_EMAIL`
- [ ] Google Business Profile setup opt-in section:
  - Toggle: "Want more customers to find you on Google?"
  - Conditional fields: address (or "no storefront" → service area), service areas, business category, recovery phone
  - We create a business Gmail, set up GBP, hand them credentials
  - They read us the postcard PIN when it arrives
- [ ] Editable submissions — owner can edit after submitting (quick: edit link on success screen; better: owner console)
- [ ] AI business name generator (for owners without a name yet — GPT suggests based on service type, area, language)
- [ ] Service tier picker on form (so owner can pick packages)

---

## 🌐 Translation / i18n

- [ ] Wire `data-i18n` + `es`/`pt` dictionaries into the new `/` (WelcomeMat homepage) and `/swoop/index.html` — currently breaks parity with `pitch.html` which is fully translated. Privacy/terms can stay English.
- [ ] Fix "TRUSTED BY EASTSIDE FAMILIES" badge on Camellia site — not translating
- [ ] Admin dashboard in Portuguese/Spanish for non-English business owners
- [ ] Translate admin analytics to owner's preferred language

---

## 📨 Client communication pipeline

- [ ] Add "preferred contact method" to onboarding form (Email / WhatsApp / Both)
- [ ] Auto-acknowledgement on form submit ("we got it, here's what happens next")
- [ ] Email templates (auto-fill with client info):
  - `Need More Info / Follow-Up`
  - `Site Preview Ready`
  - `Go-Live`
- [ ] WhatsApp integration (many SMB owners prefer it over email)
- [ ] Set up sending from welcomematdigital.com (currently using Resend sandbox `onboarding@resend.dev`)
- [ ] Admin UI: pick template → auto-fill → preview → send via owner's preferred channel
- [ ] Admin "Send Preview" button — generate URL, compose message, send via SMS/WhatsApp
- [ ] Set up `hello@welcomematdigital.com` and `privacy@welcomematdigital.com` (referenced on Swoop pages but don't exist yet)

---

## 💰 Pricing & billing

- [ ] Stripe integration (after 3+ verbal-committed customers)
- [ ] Trial period tracking
- [ ] Plan / tier tracking in `businesses` table (column exists, no enforcement)
- [ ] Payment status
- [ ] Replace Swoop `mailto:` signup with real form once Swoop backend exists
- [ ] Logo generation add-on — DALL-E ($25 one-time or free on $59+ tier, cost ~$0.25)
- [ ] Business card design for $99 tier
- [ ] Custom domain registration workflow via Cloudflare ($10/mo add-on)
- [ ] Annual plans (2 months free) — only after pricing validated

---

## 🏢 Business setup (DO BEFORE FIRST PAID CUSTOMER)

In priority order, from `welcomemat-playbook.md`:

| # | Task | Status |
|---|---|---|
| 1 | Register LLC ("Welcome Mat Digital LLC" — WA State) | ⬜ |
| 2 | Get EIN from IRS (free, needed for bank + taxes) | ⬜ |
| 3 | Business bank account (Chase/Mercury/Novo) — never mix personal+business | ⬜ |
| 4 | Business email (`hello@welcomematdigital.com` — Google Workspace or M365 Basic) | ⬜ |
| 5 | Customer agreement (1-2 page: scope, pricing, cancellation, assets, support, liability) | ⬜ |
| 6 | Stripe setup (invoices + recurring subscriptions) | ⬜ |
| 7 | Bookkeeping (Wave free → QuickBooks later) | ⬜ |

---

## 🚧 Tech backlog (everything else)

- [ ] Analytics / billing tracking
- [ ] Landing page builder for businesses without websites
- [ ] Business owner console (after 10+ businesses)
- [ ] Provider-agnostic LLM setup (swap models via config) — only if OpenAI cost spikes
- [ ] Config-driven site template (Phase 1 templatization) — triggered at customer #3
- [ ] Admin tooling for content collection during onboarding (currently manual)
- [ ] Remove dead `better-sqlite3` dependency from `package.json`
- [ ] Remove Plateau Kitchen seeding code from `server/index.js`
- [ ] Update `render.yaml` `plan: free` → `plan: starter` to match reality
- [ ] Document non-OpenAI env vars in `.env.example`
- [ ] Cleanup stale local branches (`copy-refinement-v1`, `camellia-review-v1`)

---

## 🅿️ Parking lot (ideas, not committed)

- Swoop bundle (missed-call + web chat = "never miss a customer")
- Free tier (20 convos/mo) as lead gen
- "Founding 100" pricing locked-in pitch
- Site DNA generator — let admin click "randomize" within constraints to preview combos
- Owner-facing analytics dashboard
- Mobile app for owners to manage their site
- Multi-location support
- HVAC / roofing / plumbing demos (gated behind paying customer in vertical)
- Annual maintenance subscriptions
- Photo upload during onboarding (auto-crop, auto-resize, alt text via GPT-Vision)
- Newsletter / monthly tips for business owners
- Referral tracking dashboard

---

## ❌ Explicitly NOT doing (right now)

- Building admin tools before 10 customers — spreadsheets are fine until they're not
- Optimizing for edge cases — build for the 80% (service biz, 1 location, 3-6 services, phone/WhatsApp)
- HVAC/roofing/plumbing demos before a customer in those verticals
- Generic FB groups for outreach (full of competing marketers)
- Custom CSS per customer (CSS variables only)
- Per-customer JS logic (keep all JS in shared template)
- Hand-written translations (AI-generate from EN)
- Treating sites as projects (it's a configuration)
