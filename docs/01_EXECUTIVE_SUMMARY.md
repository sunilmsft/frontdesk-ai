# 01 — Executive Summary

> **Read time:** 5 minutes. This is the front door to the project. If you only read one file, read this one.

---

## What this project is

**FrontDesk AI** is the production codebase that powers **WelcomeMat Digital LLC** — a digital presence platform for small local service businesses (cleaners, restaurants, landscapers, trades, salons).

The project provides each customer with:
1. A custom-feeling landing page hosted at `/site/{slug}` and/or their own domain
2. An embedded AI chat widget that answers customer questions 24/7 in the customer's language
3. A multi-step quote intake form with email notifications to the business owner
4. (Planned) Google Business Profile reviews integration

The same repo also hosts the marketing surface for two sibling products:
- **WelcomeMat Digital** holdco homepage at `/`
- **Swoop** (missed-call text-back SaaS) marketing pages at `/swoop/*`

---

## Current state (as of June 14, 2026)

| Metric | Value |
|---|---|
| Live paying customers | **0** (Camellia Cleaning is in "live preview" with no contract yet) |
| Live customer sites | **1** — Camellia Cleaning |
| Demo archetypes built | **~17** under `public/demos/` (cleaning, tree, landscaping, locksmith, salon, restaurant, etc.) |
| Production URL | https://welcomematdigital.com (alias of https://frontdesk-ai-vx1s.onrender.com) |
| Hosting | Render Starter plan ($7/mo, always-on) |
| Repo | https://github.com/sunilmsft/frontdesk-ai |
| Auto-deploy | Render watches `master` branch — `git push` = production deploy |
| Monthly infra cost | ~$8/mo (Render $7 + Cloudflare domain $0.87 + OpenAI free tier) |
| Most recent commit | `5e3dc3c` — Swoop privacy policy hardening for Twilio (June 14, 2026) |

---

## Tech stack at a glance

- **Runtime:** Node.js 18+ / Express 5
- **Database:** Turso (libSQL cloud, S3-backed) via `@libsql/client` — schema includes `businesses`, `conversations`, `messages`, `submissions`, `customer_pipeline`, `quote_requests`
- **LLM:** OpenAI GPT-4o-mini (free tier with data sharing enabled), one shared API key
- **Email:** Resend API (free tier, 100/day) for quote notifications
- **File storage:** Cloudflare R2 (S3-compatible) via `@aws-sdk/client-s3`, bucket `welcomemat-uploads`
- **Auth:** Custom JWT (`jsonwebtoken`), single admin password from env
- **Frontend:** Vanilla HTML/CSS/JS — no framework, no build step
- **Reviews source:** Google Places API (per-business `google_place_id`)

See [04_ARCHITECTURE.md](04_ARCHITECTURE.md) for full details.

---

## The 30-second product pitch

> "We give skilled local service providers the same online credibility as larger competitors — in one day, in their language, with an AI assistant that never sleeps."

**Pricing model** (set May 22, 2026 — concierge, not SaaS-tiered):
- **$59/mo** flat (founding price, locked for life)
- **$149 one-time** setup (website + Google Business Profile)
- **$299 one-time** setup (above + booking flow via Square Appointments or Google Calendar)

Pricing **is not enforced in code** — no Stripe integration exists yet.

---

## Who's involved

- **Sole operator:** Sunil Venugopal (Microsoft PM by day, personal side project)
- **Personal GitHub:** `sunilmsft`
- **Commit identity:** `sunil1308@gmail.com` (changed June 14 — historical commits use the corp email)
- **First customer:** Kesia Soares (Camellia Cleaning, Brazilian house cleaner in Eastside Seattle)
- **Lead support:** No team. Solo build.

---

## The strategic bet

Most "AI for SMB" tools sell the **technology** ("AI chatbot for your website!"). This project sells the **outcome** — a polished, trustworthy online presence — and treats AI as invisible plumbing. The brand promise: every customer site looks custom-built, but under the hood 90%+ is shared (see "Visual Identity Matrix" in [02_PRODUCT_VISION.md](02_PRODUCT_VISION.md)).

Growth strategy is **one happy customer telling three friends** (Kesia → Brazilian cleaner WhatsApp network), not paid acquisition. See [02_PRODUCT_VISION.md](02_PRODUCT_VISION.md) and [10_NEXT_STEPS.md](10_NEXT_STEPS.md).

---

## What to read next

| If you are… | Read this next |
|---|---|
| A new engineer | [09_ONBOARDING.md](09_ONBOARDING.md) → [04_ARCHITECTURE.md](04_ARCHITECTURE.md) |
| A new PM | [02_PRODUCT_VISION.md](02_PRODUCT_VISION.md) → [03_CURRENT_STATE.md](03_CURRENT_STATE.md) → [06_BACKLOG.md](06_BACKLOG.md) |
| An AI assistant continuing this work | [08_AI_CONTEXT.md](08_AI_CONTEXT.md) → [05_DECISION_LOG.md](05_DECISION_LOG.md) |
| Operating it day-to-day | [03_CURRENT_STATE.md](03_CURRENT_STATE.md) → [07_KNOWN_ISSUES.md](07_KNOWN_ISSUES.md) → [10_NEXT_STEPS.md](10_NEXT_STEPS.md) |
| Researching related products | [RELATED_PROJECTS.md](RELATED_PROJECTS.md) |
