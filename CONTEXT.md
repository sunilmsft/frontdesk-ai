# FrontDesk AI — Project Context

## What It Is
AI-powered chat widget for local businesses. Customers get instant answers about menu, hours, reservations, services — 24/7, right on their website.

## Tech Stack
- **Backend**: Node.js + Express, port 3001
- **LLM**: OpenAI GPT-4o-mini (free tier via data sharing)
- **Database**: SQLite (better-sqlite3), tables: businesses, conversations, messages, submissions
- **Frontend**: Vanilla HTML/JS widget, embeddable via single script tag
- **Hosting**: Render free tier — https://frontdesk-ai-vx1s.onrender.com (auto-deploys from GitHub master)
- **Repo**: github.com/sunilmsft/frontdesk-ai

## Key URLs (Production)
- Demo site: https://frontdesk-ai-vx1s.onrender.com
- Onboarding form: https://frontdesk-ai-vx1s.onrender.com/onboard.html
- Admin console: https://frontdesk-ai-vx1s.onrender.com/admin.html
- Color picker: https://frontdesk-ai-vx1s.onrender.com/pick-color.html

## Pages Built
- `public/index.html` — Demo restaurant site (The Plateau Kitchen), modern design
- `public/admin.html` — Admin console: stats, businesses, conversations, submissions tab with approve flow
- `public/onboard.html` — Business onboarding questionnaire, Spanish/English toggle, theme presets, auto-detect brand color
- `public/pick-color.html` — Visual theme color picker (internal tool)
- `public/widget/frontdesk-widget.js` — Embeddable chat widget with SVG icons, smooth animations, per-business theming

## Onboarding Flow
1. Business owner fills out form at /onboard.html (supports Spanish)
2. Submission saved to `submissions` table (status: pending)
3. Admin reviews in Submissions tab, clicks "Approve & Create Business"
4. Business goes live, embed code available in Business Info tab

## API Keys & Costs
- OpenAI API key in `.env` (OPENAI_API_KEY) — NEEDS REGENERATION (exposed in chat)
- Free tier: 2.5M tokens/day on mini models (requires data sharing enabled in OpenAI settings)
- $10 credit balance on OpenAI account (auto-recharge ON — consider turning off)
- One API key for entire platform, not per-business

## Decisions Made
- LLM journey: Claude Sonnet → Gemini Flash → OpenAI GPT-4o-mini (settled)
- System prompt includes current date/time so AI knows what day it is
- System prompt includes multilingual instruction (respond in customer's language)
- Framing: "virtual front desk employee" — NOT mentioning AI to business owners
- Pilot size: 3 businesses, 1 week — keep scope tight, learn fast
- Render free tier (spins down after 15 min inactivity, ~30-50s cold start)

## Pilot Customers
- **Raaga's Cuisine** (Gayathri Sankaran) — South Indian restaurant, has WordPress site managed by dev in India. Interested, checking with husband. Shared onboard link.
- **Kesia Soares** (house cleaner) — Brazilian, PT-BR speaker. No website, no business name yet. Very interested + will promote to 400+ Brazilian service workers in WhatsApp groups. Potential sales partner. Submitting onboard form ~May 19.

## Strategic Direction (May 19, 2026)
- Landing page/site IS the core product, not an add-on to the widget
- Considering renaming to "Front & Center" as LLC/umbrella brand
- Each business site must look unique (not cookie-cutter)
- Need admin auth, DB migration, and cloud storage BEFORE going live with real customers

## Subscription Tracker
- OpenAI API (free tier with sharing, $10 credit balance)
- Render (free tier, auto-deploys from GitHub)

## Personal PC Migration (DO BEFORE FIRST PAID CUSTOMER)
### Step-by-Step
1. **GitHub Copilot Pro+** — Subscribe at github.com/features/copilot ($39/month) with personal GitHub account (sunilmsft)
2. **Install VS Code** on personal laptop
3. **Install GitHub Copilot extension** — sign in with personal GitHub account
4. **Clone the repo** — `git clone https://github.com/sunilmsft/frontdesk-ai.git`
5. **Install Node.js** (v18+) — download from nodejs.org
6. **Create `.env` file** in project root with your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-key-here
   NODE_ENV=production
   ```
7. **Run `npm install`** then `npm run dev` to verify everything works locally
8. **Verify Render deployment** — Render is linked to GitHub repo, so deploys still work automatically
9. **Memory files** — Copilot memory is tied to your GitHub account, not the machine. If using same GitHub account, memories carry over. If different account, copy `/memories/repo/` contents manually.
10. **Test the full flow** — submit a test onboarding form, approve in admin, chat with the widget
11. **Regenerate OpenAI API key** — old one was exposed in chat history

### Costs After Migration
| Item | Monthly Cost |
|------|-------------|
| GitHub Copilot Pro+ | $39 |
| Render (always-on) | $7 |
| PostgreSQL (Render/Supabase) | $0-7 |
| OpenAI API (per customer) | ~$0.30-0.75 |
| Domain (per customer, if needed) | ~$0.83-1.25 |
| Cloud storage (Cloudinary free) | $0 |
| **Fixed (before customers)** | **~$46-53** |
| **Per customer** | **~$1.13-2.00** |

## Add-Ons & Upsells
- **Logo Generation** — AI-generated logos via DALL-E. Add-on at $25 one-time for $29 tier, free on $59+ tiers. Cost: ~$0.25 per customer.
- **Custom Domain** — Register via Cloudflare (~$10-15/year). Charge $10/month. ~$105-110/year profit per domain.
- **Business Card Design** — Include in $99 tier. Generate matching business card from logo + contact info.
