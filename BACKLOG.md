# FrontDesk AI — Backlog & Ideas

## Current Status: Strategic Planning Done, Infra Hardening Next (May 19, 2026)

## 8 Pillars (Strategic Roadmap — agreed May 19)
1. **Site Builder Framework** — Templated but unique landing pages per business (themes, layouts, branding) — THIS IS THE CORE PRODUCT, not an add-on
2. **Multi-language Sites** — Language switcher on each site + onboarding question for which languages
3. **Integrations** — Google Reviews, Google Calendar, future add-ons
4. **Business Owner Console** — Each owner sees their own dashboard (bookings, reviews, chat history)
5. **Admin CRM Pipeline** — Lead → onboard → approve → test → launch → manage → bill
6. **Payments & Billing** — Stripe, trial periods, tier tracking, payment status
7. **Branding & Naming** — "Front & Center" as LLC/umbrella name, product code names (Swoop already named)
8. **Photo/Media Upload** — Collect business photos during onboarding for use on their site

## Infra Hardening (DO BEFORE KESIA GOES LIVE)
- [ ] **Admin auth** — add login/password to admin console + API routes (PRIORITY — trust building)
- [ ] **Migrate SQLite → hosted DB** — Render ephemeral disk = data loss risk (PostgreSQL on Render or Supabase free)
- [ ] **Cloud file storage** — for business photos/assets (can't use Render disk)

## GTM — Pilot Outreach
- [ ] Post in "Sammamish & Issaquah Restaurant Support" FB group (3.1K members)
- [ ] Post in "Eastside Women's Small Business Owners" FB group (304 members)
- [x] Message Raaga's Cuisine (Gayathri) — interested, shared onboard link, checking with husband/WordPress dev
- [x] Message house cleaner (Kesia) — very interested, Brazilian, shared onboard link, promoting to other Brazilian cleaners!
- [ ] Collect responses and qualify (aim for 3)

## Kesia — Priority Build (approved for time + small $ investment)
- [ ] Wait for her onboarding form submission (PT form is live)
- [ ] Build her landing page (`/site/kesia` — PT-first, mobile-first, services, pricing, chat widget)
- [ ] Help her set up Google Business Profile (service area business, house cleaning category)
- [ ] Google Places API integration — pull live reviews onto her landing page
- [ ] Add "What Our Clients Say" section with Google review cards + star ratings
- [ ] Give her a review request link/template she can text clients after jobs
- Cost estimate: ~$0/month (Google $200 free credit covers API, Render free tier, OpenAI free tier)

## Completed
- [x] Deploy to production (Render free tier — https://frontdesk-ai-vx1s.onrender.com)
- [x] Admin console with stats, conversations, business management
- [x] Onboarding questionnaire with submission/approval flow
- [x] Spanish language toggle on onboarding form
- [x] Brazilian Portuguese language toggle on onboarding form
- [x] Multilingual chatbot (auto-responds in customer's language)
- [x] Theme presets + auto-detect brand color from website
- [x] Modern demo site + polished chat widget (SVG icons, animations)

## Onboarding Flow
1. Share onboard link with business owner
2. They fill out questionnaire (English or Spanish) → clicks "Submit"
3. Submission saved as pending → red badge in admin Submissions tab
4. Admin reviews generated prompt, clicks "Approve & Create Business"
5. Business goes live → send embed script tag to business owner/their web dev

## After Pilot — Ask These
- "If this was a paid service, what would you expect to pay monthly?"
- "What was most useful? What was missing?"
- "Would you keep using this?"

## Pricing Strategy (DRAFT — validate after pilot)

### Tiers
| Tier | Price | What's Included |
|------|-------|-----------------|
| Widget Only | $29/mo | Embed chat widget on existing site, AI trained on biz, multilingual, 200 convos/mo |
| Landing Page + Widget | $59/mo | Custom hosted page (PT/ES/EN), services/pricing/hours, Google Reviews section, chat widget, shareable URL, 200 convos/mo |
| Full Package | $99/mo | Everything above + Google Business Profile setup help, review request templates, monthly prompt tuning, 500 convos/mo |

### Add-ons
- Custom domain (e.g. kesiacleaning.com): +$10/mo
- Extra conversations beyond limit: $0.15 each

### Unit Economics
- Cost per customer: ~$0.53/mo (OpenAI ~$0.50, Google API ~$0.03, Render shared ~$0)
- Margin: ~98% on $29 tier, ~99% on $59/$99 tiers
- At scale (paid Render $7/mo, higher OpenAI): ~$2-3/customer

### Referral Program (Kesia model)
- Referrer gets 1 month free per sign-up they bring
- Referred customer gets first month free
- Cost to us: ~$0.53 per free month

### Pricing Notes
- $29 is impulse-buy for any business (less than one customer's revenue)
- $59 for website + AI is cheaper than Wix alone ($17/mo) and it actually answers questions
- $99 "do it all for me" is perfect for non-English-speaking owners
- Competitors charge $200-500/mo for less
- DO NOT lock in pricing yet — run pilots free, validate, then price when referral #3-4 asks

### Future Pricing Ideas
- Swoop bundle discount (missed-call + web chat)
- Annual plans (2 months free)
- Free tier (20 convos/mo) as lead gen

## Future Ideas
- Integrate with Swoop — "never miss a customer" bundle (web + phone)
- Standalone page for businesses without websites
- Provider-agnostic LLM setup (swap models via config)
- Business owner dashboard (build when scaling past 10 businesses)

## Tech Backlog
- [x] Google Places API integration (fetch + display reviews on business landing pages)
- [x] Google Place ID picker in admin — search, preview, connect/disconnect reviews
- [x] Client dashboard tab — domain, plan, billing, add-ons tracking per business
- [x] Custom domain routing — business domains serve their site directly
- [ ] **Google Search Console** — verify welcomematdigital.com, track search terms, monitor indexing
- [ ] **Client Communication Pipeline** — automated + templated messaging through the customer lifecycle:
  - [ ] Add "preferred contact method" to onboarding form (Email / WhatsApp / Both)
  - [ ] **Auto-acknowledgement** — when onboarding form is submitted, auto-send a "we got it, here's what happens next" message
  - [ ] **Email templates for admin** — pre-built templates that auto-fill with client info:
    - `Need More Info / Follow-Up` — request missing details from submission
    - `Site Preview Ready` — share preview link, what to check, how to give feedback, domain options
    - `Go-Live` — domain is set, Google Business Profile setup steps, what to share with customers, how reviews work
  - [ ] **WhatsApp integration** — many SMB owners (especially immigrant communities) prefer WhatsApp over email
  - [ ] Set up email sending from welcomematdigital.com domain (e.g. hello@welcomematdigital.com)
  - [ ] Admin UI: pick a template → auto-fills client details → preview → send via their preferred channel
- [ ] Add rate limiting for production
- [ ] Restrict ALLOWED_ORIGINS per business
- [ ] Add auth on admin routes (currently open — anyone with URL can access)
- [ ] Analytics/billing tracking
- [ ] Landing page builder for businesses without websites (Kesia is first use case)
- [ ] Admin dashboard in Portuguese/Spanish for non-English business owners
- [ ] Translate admin analytics to owner's preferred language
- [ ] Logo generation add-on — AI-generated logos via DALL-E ($25 one-time or free on $59+ tiers, cost ~$0.25)
- [ ] Business card design for $99 tier
- [ ] Custom domain registration workflow (Cloudflare, $10/mo add-on)
- [ ] Editable submissions — let business owners edit their info after submitting (quick: edit link on success screen; better: part of owner console)
- [ ] AI business name generator on onboarding form (for owners without a name yet — uses GPT to suggest names based on their service type, area, and language)
- [ ] Service tier picker on onboarding form (show available packages so they can pick and choose what they want)
