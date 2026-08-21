# 10 — Next Steps

> Forward-looking. As of June 14, 2026. Re-read after every milestone and prune ruthlessly.

---

## This week

### BNI Eastside Connection readiness

See the single-source tracker: [BNI September 3 readiness](welcomemat/BNI-SEP3-READINESS.md).

### 🥇 Get Kesia from "live preview" to "real customer"
This is the single highest-leverage action. Until Kesia is a real, paying, referring customer, no system, no demo, no outreach matters.

- [ ] Kesia picks domain (`camelliacleaning.com`?)
- [ ] Purchase via Cloudflare (~$10.46/yr) → DNS configured → add custom domain in Render dashboard for SSL
- [ ] Help Kesia set up Google Business Profile (service area business, house cleaning category)
- [ ] Set `businesses.google_place_id` once she's listed → swap manual review fallback for live Google reviews
- [ ] Send her a review-request template she can text past clients

### 🥈 Twilio TFV resubmission (Swoop)
- [ ] Use the hardened `/swoop/privacy.html` + `/swoop/consent.html` to resubmit
- [ ] Track Twilio response

### 🥉 Translation parity on new pages
- [ ] Add `data-i18n` + ES/PT dictionaries to `/` (WelcomeMat homepage) and `/swoop/index.html`
- [ ] Fix "TRUSTED BY EASTSIDE FAMILIES" badge translation on Camellia site

---

## This month

### Land 3 free pilots
From the June 2 strategy:
- [ ] Rewrite "MS PM credibility" line in outreach FB post (user has migration concerns)
- [ ] Post the FB pitch in 2-3 Eastside FB groups (cap intake at 3)
- [ ] Build Maggie's Magic Services demo as pilot #1
- [ ] As pilots come in: build site → live with chat + quote form → add to pipeline tracker

### Hardening before public traffic
- [ ] Rotate ALL secrets exposed in May 21 chat history (see [07_KNOWN_ISSUES.md](07_KNOWN_ISSUES.md))
- [ ] Set `JWT_SECRET` in Render (don't rely on insecure fallback)
- [ ] OpenAI dashboard: account-wide hard cap $100/mo + $50 email alert
- [ ] OpenAI dashboard: scoped FrontDesk project, $20/mo cap, dedicated API key
- [ ] Per-customer OpenAI usage tagging (`user: biz_<slug>` + `metadata`)
- [ ] Set up `hello@welcomematdigital.com` and `privacy@welcomematdigital.com` (referenced on Swoop pages but don't exist)
- [ ] Configure Resend custom domain for `welcomematdigital.com` so emails come from `hello@welcomematdigital.com` instead of sandbox sender

### Documentation maintenance
- [ ] Update `.env.example` with all required variables
- [ ] Update `render.yaml` `plan: free` → `plan: starter`
- [ ] Remove dead `better-sqlite3` dependency from `package.json`
- [ ] Remove Plateau Kitchen seeding from `server/index.js`

---

## This quarter

### Convert pilots to paying customers
- [ ] After 30 days of pilot use, ask: "If this was a paid service, what would you expect to pay monthly?" / "What was most useful? What was missing?" / "Would you keep using this?"
- [ ] Lock pricing based on actual signal — not the speculative $59/mo
- [ ] Stripe integration once 3+ verbal commitments
- [ ] First customer agreement template (1-2 page: scope, pricing, cancellation, assets, support, liability)

### Business setup (DO BEFORE FIRST PAID CUSTOMER)
- [ ] Register **Welcome Mat Digital LLC** in WA State
- [ ] Get **EIN** from IRS
- [ ] Open business bank account (Chase / Mercury / Novo)
- [ ] Set up bookkeeping (Wave free, upgrade to QuickBooks later)

### Templatization Phase 1
Triggered at customer #3 per playbook:
- [ ] Design config schema for `public/sites/_template.html` + `{slug}/config.json`
- [ ] Refactor Camellia site into template + config to validate the pattern
- [ ] All new customers built via config from then on

### Client communication pipeline
- [ ] Add "preferred contact method" to onboarding form
- [ ] Auto-acknowledgement email on form submit
- [ ] Email templates: `Need More Info`, `Site Preview Ready`, `Go-Live`
- [ ] Admin UI: pick template → auto-fill → preview → send

### Per-business email notifications
- [ ] Add `owner_email` column to `businesses` table
- [ ] Update `routes/quote.js` to email per-business owner, not global `NOTIFICATION_EMAIL`

---

## Half-year horizon (only if customer growth justifies)

- [ ] Logo generation add-on (DALL-E) for $25 one-time / free on $59+ tier
- [ ] Business card design for $99 tier
- [ ] Custom domain registration workflow via Cloudflare
- [ ] Annual plans (2 months free) — validated by ≥3 paying customers asking
- [ ] Business owner console (read-only dashboard per owner)
- [ ] WhatsApp integration for onboarding follow-ups
- [ ] Admin dashboard in PT/ES for non-English owners
- [ ] AI business name generator on onboarding form

---

## Watch items — if these become real, rethink the plan

### Signals to stay the course
- ✅ Kesia happy and bringing in 2-3 cleaner referrals from her WhatsApp group
- ✅ At least 1 Eastside FB pilot signup within 30 days of posting
- ✅ Raaga's Cuisine reactivates
- ✅ Twilio TFV approved for Swoop
- ✅ 3 paying customers within 30 days of Kesia going live

### Signals to pivot or pause
- ❌ Zero paying customers 30 days after Kesia goes live despite active outreach
- ❌ Kesia's network doesn't bite even with personal endorsement
- ❌ Twilio rejects TFV again — may need to drop SMS entirely from product line
- ❌ Each new customer site takes >2 hours despite Phase 1 templatization
- ❌ OpenAI cost per customer climbs past $5/mo at usage scale
- ❌ Two competitors clearly outflank on the multilingual + immigrant-friendly positioning

---

## Drift protection — Re-check monthly

| Risk | Signal | Reset |
|---|---|---|
| Custom agency drift | Spending >2hrs per customer site | Identify the time sink. Content → fix onboarding. Design → make it a knob. Custom → charge or decline. |
| Feature bloat | Adding features no current customer asked for | Every feature traces to a real request or measurable goal |
| Operational overload | More time maintaining than building | Template is too fragile. Invest in shared infra. |
| Template flattening | Two customers look identical side-by-side | Check the 5-axis DNA matrix; mix it up |
| Over-corporate UX | Site feels like a SaaS company | Serif fonts, warm colors, personal photos, first-person copy |

---

## Personal infrastructure (separate from product)

Not strictly "next step" for the project, but mentioned in `welcomemat-playbook.md` section 9 and the original CONTEXT.md migration plan:

- [ ] **GitHub Copilot Pro+** subscription on personal `sunilmsft` account ($39/mo)
- [ ] Personal laptop set up with VS Code + Copilot
- [ ] Verify Render OAuth uses personal GitHub email, not corp email
- [ ] Verify OpenAI account primary email is personal (per repo memory, all third-party accounts already use Google login — verify OpenAI specifically since it's runtime-critical)
- [ ] Optional: rewrite git history to remap `sunilve@microsoft.com` → `sunil1308@gmail.com` for old commits (requires force-push)
- [ ] Optional: rename GitHub repo to drop `sunilmsft` branding (after a paying customer exists)

---

## Future ideas (parking lot)

- Swoop bundle ("never miss a customer" = web chat + missed-call text-back)
- Free tier (20 convos/mo) as lead gen
- "Founding 100" pricing locked-in pitch
- Multi-location support
- Annual maintenance subscriptions
- Photo upload during onboarding with auto-crop + alt text via GPT-Vision
- Newsletter / monthly tips for owners
- Referral tracking dashboard
- DNA "randomize" button in admin to preview combos within constraints
- Mobile app for owners to manage their site
- Provider-agnostic LLM (swap models via config) — only if OpenAI cost spikes
