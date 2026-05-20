# FrontDesk AI — Site Build Playbook
> Lessons from building Camellia Cleaning (Customer #1). Use this for every new client site.

## Pre-Build Checklist
- [ ] Collect ALL assets upfront before writing any HTML:
  - Logo (high-res, prefer PNG/SVG with transparent bg — NOT thin-line logos)
  - Owner photo (well-lit, branded if possible)
  - Work photos (6-10 minimum, renamed descriptively)
  - Business card or brand guide if they have one
- [ ] Collect business info in one pass:
  - Business name, owner name, phone, email
  - Service list (with descriptions)
  - Service areas
  - Hours of operation
  - Languages spoken
  - Color preference (ask early — "pick 1-2 colors that represent your brand")
  - Tagline or mission statement (in their own words)
- [ ] Create DB record FIRST (slug, system_prompt, welcome_message, theme_color)
- [ ] Set up photo folder: `public/sites/{slug}/photos/` and `logo/`

## Design Decisions That Worked
- **Font pairing**: Cormorant Garamond (serif headings) + DM Sans (body) — premium feel
- **Color formula**: One dark primary + one warm accent (champagne/gold works universally) + off-white bg (#fafaf8)
- **3D card shadows**: `0 10px 30px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.04)` — elevated but not gaudy
- **Section labels**: Accent-colored, uppercase, letter-spacing: 3px — creates visual rhythm
- **Buttons**: Uppercase, letter-spacing: 0.3px, 8px radius — clean and modern
- **Dark hero with gradient**: Works well for cleaning businesses (shows photos better)

## Mistakes to Avoid

### Logo
- **Never use thin-line logos at small sizes** — they disappear at 36-48px
- **Always set `display: block`** on logo img — don't rely on JS onload handlers
- **Use circular frame with accent border** for non-square logos — looks polished at any size
- If client doesn't have a good logo, crop the best element from their business card

### Navigation
- **Keep nav dark if hero is dark** — a white scroll state clashes with light logos
- Dark frosted glass on scroll: `rgba(10,10,10,0.95)` + `backdrop-filter: blur(12px)`
- **Don't put important UI in bottom-right** — it overlaps with the chat widget

### Language Picker
- **Use a dropdown with full language names + flags**, not abbreviation toggles (EN/PT/ES)
- Users don't know language codes — "English", "Português", "Español" with 🇺🇸🇧🇷🇲🇽 flags
- **Place in nav bar**, not floating — avoids chat widget overlap
- Changing language MUST translate: nav links, all content, CTA buttons, AND the chat widget greeting

### Chat Widget
- Widget uses `data-business="{{BUSINESS_SLUG}}"` (slug, NOT UUID)
- Greeting tooltip shows after 3s delay — make sure `welcome_message` is set in DB
- The widget greeting should be translatable — wire it into the i18n system
- **Test the chatbot with a real question** before sharing with client

### Photos
- Rename photos descriptively (bedroom-airbnb.jpeg, not IMG_4392.jpeg)
- Use 3 best photos in hero, 6 in gallery
- Before/after pairs are powerful — use them
- Owner photo in About section makes it personal and trustworthy

### About Section
- **Use the owner's actual words** — don't over-polish into corporate speak
- Pet-friendly, family-owned, personal mission → these resonate
- Include owner photo — builds trust immediately
- Add signature line with name + title

### Colors
- Ask client for color preference EARLY (before building anything)
- Update DB `theme_color` when colors change — the widget uses it
- Champagne accent (#c4b5a0) is versatile — works with black, navy, forest green

### CTA Section
- 3 symmetric buttons: Call, Text, WhatsApp (with min-width for alignment)
- WhatsApp link format: `https://wa.me/1XXXXXXXXXX` (no dashes, include country code)
- Phone link: `tel:+1XXXXXXXXXX`
- SMS link: `sms:+1XXXXXXXXXX`

### i18n / Translations
- Add `data-i18n` attributes to ALL visible text from the start (including nav links, CTA)
- Build all 3 (or N) language objects at once — don't retrofit
- Include `widgetGreeting` key in translations for the chat tooltip
- Set `document.documentElement.lang` on switch for accessibility
- Nav CTA button text must translate too ("Get a Free Estimate" → "Orçamento Grátis")

### System Prompt
- Include: business name, owner, services list, hours, phone, email, languages
- Add personality: "Be warm and professional"
- Add pricing guidance: "say it depends on size/type, offer free estimate"
- Inject current date/time so AI knows what day it is (already in code)
- Mention pet-friendly or other differentiators

## Template for New Sites
1. Copy `public/sites/camellia-cleaning/` as starting point
2. Find-replace: business name, slug, phone, email, areas, hours
3. Update photos, logo, colors, services
4. Update translations (all languages)
5. Create DB record with system_prompt + welcome_message
6. Test: page load, all nav links, language switching, chatbot, mobile responsive
7. Share preview URL with client
8. Get approval → set up custom domain

## Deployment Flow
1. All changes local → test at `localhost:3001/site/{slug}`
2. Commit + push to GitHub
3. Render auto-deploys from master
4. Share `frontdesk-ai-vx1s.onrender.com/site/{slug}` as preview
5. Client approves → buy domain → point DNS to Render
6. Add custom domain in Render dashboard

## What to Collect Post-Approval
- [ ] Domain preference (check availability during onboarding)
- [ ] Google Business Profile link (for SEO)
- [ ] Social media links (Instagram, Facebook)
- [ ] Any review/testimonial quotes
- [ ] Payment method for domain + hosting
