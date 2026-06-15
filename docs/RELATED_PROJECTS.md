# Related Projects

> How FrontDesk AI fits into Sunil's broader project family. Each entry explains the relationship, shared dependencies, decisions, risks, and terminology.

---

## Product family overview

```
                ┌────────────────────────────────────┐
                │   Welcome Mat Digital LLC          │
                │   (umbrella legal entity, not yet  │
                │   registered as of June 2026)      │
                └────────────────┬───────────────────┘
                                 │
                  ┌──────────────┴──────────────┐
                  │                             │
        ┌─────────▼─────────┐         ┌─────────▼─────────┐
        │   FrontDesk AI    │         │      Swoop        │
        │   (this repo)     │         │  (separate repo)  │
        │                   │         │                   │
        │  • Sites + chat   │         │  • SMS text-back  │
        │    + quote forms  │         │    for missed     │
        │  • Customer:      │         │    calls          │
        │    Camellia       │         │  • Twilio + AI    │
        └───────────────────┘         └───────────────────┘
                  │                             │
                  └──────────────┬──────────────┘
                                 │
                       Shared homepage at
                       welcomematdigital.com
                       (rendered by FrontDesk
                        AI repo's server)
```

**Public brand** = WelcomeMat
**Holdco** = Welcome Mat Digital LLC (WA state, unregistered)
**Domain** = welcomematdigital.com (Cloudflare, $10.46/yr)

---

## 1. WelcomeMat (the umbrella)

### What it is
The marketing surface and legal entity. Not a separate codebase — the WelcomeMat holdco homepage at `/` is served from **this repo** by `server/index.js`.

### Where it lives
- **Code:** This repo. Files: `public/index.html` (holdco homepage), `public/pitch.html` (FrontDesk pitch), `public/swoop/*` (Swoop pages)
- **Domain:** welcomematdigital.com → Cloudflare → Render Starter
- **Legal:** "Welcome Mat Digital LLC" (WA State, name confirmed available May 2026, **not yet registered**)

### Relationship to FrontDesk AI
- FrontDesk AI is the *codebase that powers WelcomeMat*
- "FrontDesk AI" remains the internal product name for the chat-widget component
- All customer-facing branding says "WelcomeMat" — never "FrontDesk AI"

### Brand origin
- Renamed from FrontDesk AI → WelcomeMat on **May 19, 2026** (see [05_DECISION_LOG.md](05_DECISION_LOG.md))
- Insight that drove the rename: "the landing page IS the product, not the chat widget"
- Also considered "Front & Center" — rejected as less concrete

### Risks tied to WelcomeMat brand
- **Name overlap:** `welcomemat.com` is a 20-year car wash marketing company in Atlanta, GA. Different vertical, low risk at current scale. Proper trademark search needed before scaling past 10 customers.
- **LLC unregistered:** Public pages claim "Welcome Mat Digital LLC" but the entity doesn't legally exist yet. Required before first paid customer.

---

## 2. FrontDesk AI (this repo)

### What it is
The runtime product:
- Per-customer landing pages at `/site/{slug}` or custom domains
- Embedded AI chat widget (`/widget/frontdesk-widget.js`)
- Multi-step quote intake forms (`POST /api/quote`)
- Google Business Profile reviews integration
- Admin Command Center (`/admin.html`) with full CRM pipeline

See [04_ARCHITECTURE.md](04_ARCHITECTURE.md) for the technical detail.

### Relationship to WelcomeMat
This codebase **is** WelcomeMat from the user's perspective. The "FrontDesk AI" name only appears:
- In the repo name (`sunilmsft/frontdesk-ai`)
- In internal docs / decision history
- As the legacy pitch page at `/pitch` and `/frontdesk`

---

## 3. Swoop (sibling product, separate repo)

### What it is
A **missed-call text-back SaaS** for local service businesses. When someone calls and the business doesn't pick up, Swoop sends an AI-generated SMS back with the business's info and asks how it can help.

### Where it lives
- **Code:** Separate repo at `C:\Users\sunilve\OneDrive\GitHub Copilot Fun Projects\swoop\` (workspace adjacent to this one)
- **Marketing pages:** In **this repo** at `public/swoop/*.html`:
  - `index.html` — hero, problem, how-it-works, $19 Founding 5 pricing
  - `privacy.html` — SMS Privacy Policy (Twilio TFV compliance)
  - `terms.html` — Terms of Service
  - `consent.html` — Standalone Opt-In Flow page
- **Public URL:** https://welcomematdigital.com/swoop

### Relationship to FrontDesk AI

**Shared:**
- Same legal entity (Welcome Mat Digital LLC)
- Same domain (welcomematdigital.com)
- Same marketing surface (rendered from this repo)
- Same OpenAI account / API key (per current setup)
- Same target customer (SMB local service businesses)
- Same brand DNA (concierge, immigrant-friendly, multilingual aspirations)
- Same operator (Sunil)
- Same git identity since June 14 (`sunil1308@gmail.com`)

**Not shared:**
- Separate codebase / repo
- Separate runtime (Swoop runs its own server with Twilio webhook)
- Separate pricing model (Swoop $19/mo Founding 5; FrontDesk $59/mo founding)
- Separate customer base (no Swoop customers yet pending Twilio TFV)

### Why Swoop pages live in the FrontDesk AI repo
Because the brand decision (May 28, 2026) was that **WelcomeMat presents as one company with two products**. Putting Swoop pages on a unified site at welcomematdigital.com helps Twilio's Brand Identity check (TFV rejection #2 cited "Brand Identity Mismatch" — Gmail domain, no real Swoop product page).

### Shared risks
- **Twilio TFV is a Swoop blocker right now.** If Swoop can't send SMS legally to non-personal contacts, the entire product doesn't work. Status as of June 14: privacy policy hardened in commit `5e3dc3c` to address "no sharing of mobile information / SMS opt-in data" concerns per Twilio compliance guidance.
- **Shared OpenAI key.** If OpenAI shuts down the account for any reason, both products break simultaneously. Backlog item: scoped FrontDesk project with dedicated key.
- **Shared domain.** Any reputational issue with Swoop (e.g., SMS abuse complaint) blasts back onto FrontDesk customers' sites via the shared domain.

### Shared terminology
| Term | Meaning |
|---|---|
| TFV | Twilio Toll-Free Verification — required for sending SMS from a toll-free number |
| SHAFT | Sex, Hate, Alcohol, Firearms, Tobacco — categories US carriers block |
| Opt-in | Explicit consent from a phone number's owner to receive SMS |
| STOP/HELP | Mandatory keyword handling for SMS programs |
| Holdco | Welcome Mat Digital LLC, the parent legal entity |
| Founding price | Locked-in pricing for first N customers ($19 for Swoop's 5, $59 for FrontDesk) |

### Future shared initiatives
From `BACKLOG.md` and repo memory:
- **Swoop bundle** — "never miss a customer" = FrontDesk site + Swoop SMS = combined offering
- **Shared customer pipeline** if both products onboard the same business

---

## 4. Camellia Cleaning (first customer — not a project, but central)

### What it is
A house cleaning business owned by Kesia Soares (Brazilian, PT-BR speaker, Eastside Seattle). The first WelcomeMat customer, currently in "live preview" without a paid contract.

### Relationship to FrontDesk AI
- Lives at `public/sites/camellia-cleaning/` (full HTML site)
- DB row in `businesses` table (slug `camellia-cleaning`)
- System prompt at `server/prompts/camellia-cleaning.txt`
- 3 customer reviews hardcoded as manual fallback in `server/routes/reviews.js`
- Owner photo + work photos in `public/sites/camellia-cleaning/photos/`
- Logo in `public/sites/camellia-cleaning/logo/`

### Strategic value
Kesia is part of a 400+ Brazilian service worker WhatsApp network. If she's thrilled and shares, the entire "Kesia flywheel" growth strategy (see [02_PRODUCT_VISION.md](02_PRODUCT_VISION.md)) activates: 5–10 referral cleaners within months.

### Outstanding work
See Kesia tasks in [10_NEXT_STEPS.md](10_NEXT_STEPS.md): domain, Google Business Profile, live reviews wiring.

---

## 5. Other side projects (separate codebases, in-name-only here)

These are Sunil's other personal projects (per user memory). They are **not technically related to FrontDesk AI** but share a single operator and may compete for time.

| Project | Brief | Status |
|---|---|---|
| **Kolo** | Family accountability PWA | Active per user memory |
| **Tuck** | Capture/organize PWA | Active per user memory |
| **HomeOps Hub** | Household dashboard | Per user memory |
| **Project Cushion** | Expense analyzer | Per user memory |
| **sunilvenugopal.com** | Personal portfolio site | Per user memory |
| **subscriptions.html** | Sunil's cross-project subscription tracker | In parent `GitHub Copilot Fun Projects/` folder. When any project adds a paid service, log it here. |

These projects share:
- Same operator (Sunil)
- Same personal GitHub (`sunilmsft`)
- Possibly the same OpenAI API key (if FrontDesk's key is reused — should be scoped per project per backlog item)
- Same subscription tracker

Nothing in FrontDesk AI's runtime depends on them.

---

## Shared dependencies (across the WelcomeMat family)

| Dependency | Used by | Risk if it disappears |
|---|---|---|
| **GitHub repo `sunilmsft/frontdesk-ai`** | FrontDesk AI (Swoop in separate repo) | Render auto-deploy breaks |
| **welcomematdigital.com (Cloudflare)** | Both | Public face disappears |
| **OpenAI API key** | FrontDesk chat + Swoop AI replies | Both products silent |
| **Render account** | FrontDesk AI hosting | Production down |
| **Turso DB** | FrontDesk only | FrontDesk down, Swoop unaffected |
| **Cloudflare R2** | FrontDesk uploads | Customer site images break |
| **Resend** | FrontDesk quote emails (Swoop separately) | Quote notifications stop |
| **Google Places API** | FrontDesk reviews + lead finder | Reviews fall back to manual, lead tool breaks |
| **Twilio** | Swoop only | Swoop down |
| **Personal GitHub account `sunilmsft`** | Both, plus Sunil's other projects | Every repo Sunil owns becomes inaccessible |

---

## Shared decisions (apply to both FrontDesk AI and Swoop)

- **Concierge over self-serve.** Both products are sold as "we set it up for you" not as "log in and configure."
- **Multilingual aspiration.** Both target immigrant-owned SMBs.
- **Founding pricing.** Both offer locked-in low pricing for early customers (Swoop $19, FrontDesk $59).
- **Brand voice.** Warm, neighborly, "your neighbors at WelcomeMat" — never corporate SaaS.
- **One operator, no team.** All decisions go through Sunil. No delegation possible.
- **Live preview > pitch deck.** Cold outreach uses a working URL, not a PDF.
- **One happy customer > systematic outreach.** Both products grow via referrals from delighted users, not paid acquisition.

---

## Shared risks

| Risk | Affects | Mitigation |
|---|---|---|
| OpenAI account suspension | Both products silent | Backlog: scoped project + hard caps |
| Twilio TFV permanent rejection | Swoop fundamentally blocked | June 14 privacy hardening; if rejected again, may need to drop SMS entirely |
| Domain reputation issue | Both products via shared domain | Strict SHAFT exclusions, opt-in only |
| Single operator burnout | Both products + 4+ side projects | Cap intake at 3 pilots; "close the first loop before building more" rule |
| Microsoft corp access loss | Identity/email risk only, no runtime impact (per repo memory + audit) | Already addressed — git identity migrated June 14 |
| Render outage | FrontDesk AI down (Swoop unaffected on different infra if applicable) | Acceptable single-region risk at current scale |
| Kesia churn before referring | Loss of primary growth flywheel | Get her domain + GBP live ASAP — see [10_NEXT_STEPS.md](10_NEXT_STEPS.md) |

---

## Shared terminology glossary

| Term | Definition | Used in |
|---|---|---|
| **WelcomeMat** | Public brand name | Both |
| **Welcome Mat Digital LLC** | Legal entity (unregistered as of 2026-06-14) | Both |
| **FrontDesk AI** | This codebase / internal product name | Internal docs |
| **Swoop** | The missed-call SMS product | Both repos |
| **Concierge model** | "We set it up for you" vs. self-serve | Pricing, marketing |
| **Founding pricing** | Locked-in low rate for first N customers | Both ($19 / $59) |
| **The Kesia flywheel** | Referral growth strategy via Kesia's network | [02_PRODUCT_VISION.md](02_PRODUCT_VISION.md) |
| **DNA combo** | The 5-axis visual identity matrix assignment per customer | Site building |
| **The 1,600 combos system** | The 4×5×4×4×5 visual permutations preventing template flattening | Brand |
| **Pipeline stages** | 12-stage CRM funnel (lead → live) | Admin tool |
| **Show, don't pitch** | Sales motion = send a live URL, not a PDF | GTM |
| **The SMB owner is the hero** | Brand principle — we're invisible infrastructure | Brand |
| **TFV / SHAFT / Opt-in** | Twilio compliance vocabulary | Swoop |
| **Subscription tracker** | `subscriptions.html` in parent folder | Cross-project |

---

## How to keep this document fresh

When you add a new product, customer, or significant integration:
1. Update the **product family diagram** at top
2. Add a new section for the project with: what it is, where it lives, relationship to existing projects, shared deps, shared risks
3. Update the **glossary** if new terms are introduced
4. Update **shared dependencies** if the new project consumes anything that's already in use elsewhere
