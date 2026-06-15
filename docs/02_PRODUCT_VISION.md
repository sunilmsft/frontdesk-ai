# 02 — Product Vision

> Sourced from `BACKLOG.md`, `SITE-BUILD-PLAYBOOK.md`, `CONTEXT.md`, `public/pitch.html`, and the WelcomeMat master playbook in repo memory.

---

## Brand identity

- **Public brand:** WelcomeMat
- **Legal entity:** Welcome Mat Digital LLC (WA state — confirmed available, **not yet registered** as of June 2026)
- **Domain:** welcomematdigital.com (Cloudflare, ~$10.46/yr)
- **Product family on this codebase:** FrontDesk AI (sites + chat + quotes), Swoop (missed-call text-back, separate runtime)

> ⚠️ **Name overlap risk:** `welcomemat.com` is a 20-year car wash marketing company in Atlanta, GA. Different vertical, similar concept. Low risk at current scale. Proper trademark search needed before scaling past 10 customers.

---

## What WelcomeMat IS

> "A modern SMB digital presence platform that gives skilled local service providers the same online credibility as larger competitors — in one day, in their language, with an AI assistant that never sleeps."

A concierge service that delivers:
- A landing page that looks custom to the customer
- An AI chat widget on that page (multilingual, business-specific)
- A quote intake flow that emails the owner
- Google Business Profile setup help
- Domain + DNS handling

---

## What WelcomeMat IS NOT

- ❌ A custom web design agency
- ❌ A generic website builder (Wix/Squarespace competitor)
- ❌ An enterprise SaaS platform
- ❌ A chatbot company

**One-line test:** If a decision makes us feel more like an agency → wrong direction. If it makes us feel more like a platform with a soul → on track.

---

## Brand DNA — Core philosophies

### 1. The SMB Owner Is the Hero
We are invisible infrastructure. Every site makes *them* look good.
- Their name is the headline. Their photo builds trust. Their words tell the story.
- "Powered by WelcomeMat" stays in the footer — subtle, never competing.

### 2. Confidence Over Complexity
SMB owners are busy, often non-technical, sometimes in a second language.
- Fewer options, better defaults. Show the result, not the process.
- One clear next step, not a decision tree.

### 3. Human-First AI
The AI assistant is a helpful front desk employee, not a chatbot.
- **Never announces itself as AI.**
- Responds in the customer's language automatically.
- Knows the business deeply. Escalates gracefully. Never fabricates (a `IMPORTANT GUARDRAIL` clause is appended to every system prompt — see [08_AI_CONTEXT.md](08_AI_CONTEXT.md)).

### 4. Perceived Uniqueness > Architectural Uniqueness
Every site **feels** custom. Under the hood, 90%+ shared.

| What creates perceived uniqueness | What stays identical (platform constants) |
|---|---|
| Hero photos | Section structure |
| Accent color | Card styling |
| Font pairing | Nav/CTA/footer patterns |
| Owner story | Widget integration |
| Service content | i18n attributes |
| Trust badges | Responsive 768px breakpoint |

---

## Voice & tone

Warm but not cutesy. Professional but not corporate. Bilingual-friendly.

- First person for the business owner: "I offer…", "We care about…"
- **Never say "custom-designed"** — say "built around your business"
- **Never say "AI-powered"** to end customers — let it just work
- Trust language uses proof: "5+ years experience", "Licensed & Insured" — not "best in class"
- CTAs are invitations: "Get a Free Estimate" not "BUY NOW"

---

## Language principles

- English is the authoring language; translations generated from EN
- Portuguese and Spanish are **first-class**, not afterthoughts
- All visible text gets `data-i18n` attributes from the start
- Widget greetings translate with page language (via `frontdesk-lang-change` event)

---

## Emotional architecture (reusable across verticals)

| Section | Emotional purpose | What varies | What's constant |
|---|---|---|---|
| Hero | Aspiration + proof | Photos, headline, badges | Dark gradient, split layout, CTAs |
| Services | "We do what you need" | Icons, titles, descriptions | Card styling, hover effects |
| Why Us | Social proof | Differentiators | 4-card grid, centered icons |
| About | Human connection | Photo, bio, signature | Grid layout, serif heading |
| Gallery | Visual proof | Photos | Grid, hover zoom, lazy load |
| Areas | "We come to you" | Area names | Pill tags |
| Hours | Reliability | Schedule | Table, today highlight |
| CTA Banner | Conversion | Phone, channels | Dark gradient, 3-button |
| Footer | Attribution | Business name | "Powered by WelcomeMat" |

---

## Visual identity matrix (the "1,600 combos" system)

To prevent the "every AI-built site looks the same" trap, every customer site is assigned **one value per axis**. Two clients in the same vertical never get the same combo.

**Axis 1 — Layout archetype**
| Key | Best for |
|---|---|
| `editorial` | Creative services, photography, design |
| `clean-grid` | Professional services, consulting, medical |
| `stacked-bold` | Trades, contractors, landscaping |
| `warm-organic` | Personal services — cleaning, childcare, pet care |

**Axis 2 — Typography mood**
| Key | Fonts |
|---|---|
| `serif-elegant` | Cormorant Garamond + DM Sans |
| `sans-modern` | Outfit + Inter |
| `slab-bold` | Bitter + Source Sans 3 |
| `hand-friendly` | Caveat + Nunito |
| `geometric` | Poppins + Work Sans |

**Axis 3 — Shape language**: `rounded` (default), `sharp`, `mixed`, `organic`
**Axis 4 — Animation style**: `subtle-rise` (default), `slide-stagger`, `scale-pop`, `none`
**Axis 5 — Icon style**: `lucide-outline`, `emoji-native`, `phosphor-fill`, `custom-blob`, `text-only`

**Math:** 4 × 5 × 4 × 4 × 5 = **1,600 visual combos** before color or content.

### DNA profiles already assigned

**Camellia Cleaning (Kesia):**
```
layout:     warm-organic
typography: serif-elegant (Cormorant + DM Sans)
shapes:     rounded (20px)
animation:  subtle-rise
icons:      lucide-outline
accent:     #c4b5a0 (warm taupe)
```

**Bold Trade (reference archetype, `public/templates/bold-trade/`):**
```
layout:     stacked-bold
typography: slab-bold (Bitter + Source Sans 3)
shapes:     sharp (4px)
animation:  scale-pop
icons:      phosphor-fill
accent:     #2563eb (electric blue)
```

**Fresh Clean (reference archetype, `public/templates/fresh-clean/`):**
- Premium cleaning vibe, editorial layout

---

## Trust architecture (layered)

1. **Immediate** (hero): badges, professional photos, clear headline
2. **Substantive** (services): detailed descriptions = expertise
3. **Personal** (about): owner photo + story = human connection
4. **Visual** (gallery): real work photos = proof
5. **Accessible** (CTA): multiple contact channels = easy to reach
6. **Persistent** (widget): instant answers = always responsive

---

## Target market

- **Geographic:** Eastside Seattle (Sammamish, Issaquah, Bellevue, Redmond, Kirkland)
- **Verticals (priority order):**
  1. **Cleaning** (existing customer + Kesia's referral network)
  2. **Salons / barbers** (high review culture, immigrant-owned often = multilingual edge)
  3. **Landscaping** (seasonal, visual-rich, no websites)
  4. **Handyman / contractors** (service area, need credibility)
  5+ Everything else — don't think about until 5+ paying customers
- **Owner profile:** Often immigrant, often non-native English, busy, prefers WhatsApp over email, currently has a Google listing but no/bad website

---

## The 8 strategic pillars

From `BACKLOG.md`, the agreed strategic shape of the product:

1. **Site Builder Framework** — Templated but unique landing pages per business — **THIS IS THE CORE PRODUCT**, not an add-on to the widget
2. **Multi-language Sites** — Language switcher + onboarding language question
3. **Integrations** — Google Reviews, Google Calendar, future add-ons
4. **Business Owner Console** — Each owner sees their own dashboard
5. **Admin CRM Pipeline** — Lead → onboard → approve → test → launch → manage → bill
6. **Payments & Billing** — Stripe, trial periods, tier tracking, payment status
7. **Branding & Naming** — "WelcomeMat" public, "Welcome Mat Digital LLC" legal
8. **Photo/Media Upload** — Collect business photos during onboarding

---

## The sales motion

> "Show, don't pitch."

Most web agencies send a PDF proposal. WelcomeMat sends a **live preview URL**. That's the real differentiator.

**The pitch in one line:**
> "I saw your Google reviews — your customers love you. I help businesses like yours look as good online as they do in person."

No mention of AI, websites, widgets, or technology.

---

## Drift protection — Things to watch

| Signal | Fix |
|---|---|
| Spending >2hrs on a customer site | Identify the time sink. Content collection → fix onboarding. Design → make it a knob. Truly custom → charge or decline. |
| Adding features no current customer asked for | Every feature traces to a real request. |
| Two customers look identical side-by-side | Check perceived uniqueness levers. |
| Site feels designed for a SaaS company | Serif fonts, warm colors, personal photos, first-person copy. |
| Building admin tools before 10 customers | Spreadsheets are fine until they're not. |
