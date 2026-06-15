# 08 — AI Context

> For an AI assistant (or PM) continuing this work without prior chat history. Captures how the LLM is used, what patterns to follow, and what conventions matter.

---

## How OpenAI is used in this project

The codebase calls OpenAI in **three places**:

| File | Endpoint | Purpose |
|---|---|---|
| `server/routes/chat.js` | `POST /api/chat` | End-customer conversation in the embedded widget |
| `server/routes/admin.js` | `POST /api/admin/ai/enhance` | Improve a single onboarding form field (admin tool) |
| `server/routes/admin.js` | `POST /api/admin/ai/generate-prompt` | Generate a full system prompt from edited onboarding data |
| `server/routes/contact.js` | inline | Translate non-English contact form submissions to English for admin |

**Model:** `gpt-4o-mini` (cheapest capable instruction-following model; multilingual response quality is good)
**API key:** Single shared `OPENAI_API_KEY` env var. No per-customer billing attribution yet (in backlog).
**Tier:** Free tier (2.5M tokens/day) requires "data sharing" enabled in OpenAI account settings.

---

## System prompt pattern

Every chat completion builds the system prompt like this, in order:

```
[business.system_prompt from DB]
+
"Current date and time: Monday, June 14, 2026, 3:42 PM."
+
(if lang !== 'en')
  "IMPORTANT: The customer has selected {language}. You MUST respond in {language}."
+
"IMPORTANT GUARDRAIL: You are ONLY allowed to answer questions related to
 {business.name} and its services. If a customer asks about something
 completely unrelated to the business (e.g. weather, trivia, coding, math,
 politics, personal advice, or anything not connected to {business.name}),
 respond warmly with something like: 'Great question, but I'm really only
 set up to help with {business.name}-related questions! If there's anything
 I can help you with about our services, I'm here. Otherwise, feel free to
 reach out to us directly — we'd love to chat!' Do NOT answer off-topic
 questions. Always steer the conversation back to {business.name}'s services."
```

**Three fixed conventions:**
1. **Always inject current date/time** — without this, AI hallucinates day-of-week when asked "are you open today?"
2. **Always include the guardrail clause** — even if the per-business prompt already has scope language
3. **Language injection is explicit** — relying on the AI to detect language from message text is unreliable; the page tells us via the `lang` param

---

## Per-business system prompt structure

Each business's `system_prompt` (column on `businesses` table) is a Markdown-style spec written by hand or via AI-generate. Format follows `server/prompts/camellia-cleaning.txt` and `server/prompts/plateau-kitchen.txt`:

```
You are a helpful AI assistant for {business name}.

About the business:
- Owner: {name}
- Phone: {number}
- Email: {email}
- Hours: {weekly hours}
- Services: {bullet list}
- Service area: {neighborhoods/cities}
- Languages: {EN, PT, ES, etc.}
- Special: {pet-friendly, eco-friendly, family-owned, etc.}

Personality:
- Warm and professional
- {tone modifier}

Pricing guidance:
- Don't quote exact prices — say it depends on {size, type, etc.}
- Always offer a free estimate
- Direct serious inquiries to the contact channels above

Greeting:
- Default: {welcome_message}

Off-topic policy:
- Politely redirect to {business name} services
- Never engage in unrelated chitchat
```

The universal guardrail clause is appended *in addition* to this at runtime.

---

## Conventions to follow

### File location & naming
- New per-business prompts → `server/prompts/{slug}.txt`
- New demo sites → `public/demos/{slug}/index.html`
- New customer-specific sites → `public/sites/{slug}/index.html`
- Slugs are kebab-case, lowercase, no special chars

### Widget integration in any site
```html
<script
  src="https://welcomematdigital.com/widget/frontdesk-widget.js"
  data-business="{slug-not-uuid}"
  data-server="https://welcomematdigital.com"
></script>
```
Use the **slug**, not the UUID. The widget greeting comes from `welcome_message` in the DB.

### Multilingual coverage
- All visible text gets `data-i18n="key.path"`
- Build EN, PT, ES dictionaries in the same pass — never retrofit
- Include `widgetGreeting` translation key (the widget tooltip uses it)
- Set `document.documentElement.lang` when language changes
- Dispatch `frontdesk-lang-change` event so widget syncs:
  ```js
  document.dispatchEvent(new CustomEvent('frontdesk-lang-change', { detail: { lang: 'pt' } }));
  ```

### "Never say AI" rule (end-customer facing)
- Marketing copy describes the chat as "your front desk helper" or similar
- Never expose "AI / GPT / OpenAI / chatbot" in customer-facing text
- The widget brand name is "WelcomeMat" not "FrontDesk AI" externally

---

## Voice / tone rules

From `BACKLOG.md`, `pitch.html`, and the master playbook:

| ❌ Avoid | ✅ Use instead |
|---|---|
| "custom-designed" | "built around your business" |
| "AI-powered" | (just describe the outcome) |
| "platform" / "dashboard" / "tools" | "your site", "your helper", "set up" |
| "BUY NOW" | "Get a Free Estimate" |
| "best in class" | "5+ years experience", "Licensed & Insured" |
| "headache" (avoid) | (just describe the relief) |
| Generic stock SaaS imagery | Real owner photos, real work photos |

---

## When writing copy

- **First person for the business owner** ("I offer...", "We care about...")
- **Neighborly tone** ("your neighbors at WelcomeMat", "built down the road in Sammamish")
- **Bilingual-friendly** — English authors, ES + PT first-class
- **Avoid corporate** — these are house cleaners, not SaaS companies
- **Trade-relatable language** — "set up over a cup of coffee", "one job at a time"
- **Concrete CTAs** — "Get a Free Estimate" / "Text Us" / "Request a Quote"

---

## When writing code

### Always
- Read the file before modifying it
- Test on `localhost:3001` before any push
- Use the slug, not the UUID, in any URL/widget code
- Update `server/db/database.js` `migrationCols` array for any new column (no formal migration tool)
- Update `.env.example` if adding a new env var

### Never
- Push to `master` without user explicit confirmation ("push it" / "yes push")
- Add features without a real customer request or measurable goal
- Refactor working code "while you're in there" — only change what was asked
- Add comments/docstrings to code you didn't change
- Add error handling for scenarios that can't happen
- Use `--no-verify` or other safety bypasses
- Hardcode secrets — always via env

### Watch out for
- The cards-on-same-color bug (see [07_KNOWN_ISSUES.md](07_KNOWN_ISSUES.md))
- Cross-pollination when copy-pasting demo templates
- Translation drift — new pages must have all 3 languages
- Single `NOTIFICATION_EMAIL` env var assumption — will break at customer #2
- The `IMPORTANT GUARDRAIL` clause is appended automatically — don't duplicate it in per-business prompts

---

## How to extend the AI integration

### Switching models
The OpenAI client is instantiated like:
```js
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...]
});
```

To switch providers, this is the only call site for chat. For a provider-agnostic LLM (in backlog), introduce a thin adapter in a new `server/llm/` directory.

### Adding per-business cost tracking
At the `openai.chat.completions.create` call site, add:
```js
{
  model: 'gpt-4o-mini',
  user: `biz_${business.slug}`,         // groups in OpenAI dashboard
  metadata: { business_slug: business.slug },
  messages: [...]
}
```

### Switching to a per-business OpenAI key (when needed)
Add `openai_api_key` column to `businesses`; instantiate the client per request:
```js
const client = new OpenAI({ apiKey: business.openai_api_key || process.env.OPENAI_API_KEY });
```

---

## What another AI should know about this codebase

1. **The user is a Microsoft PM, not a senior software engineer.** Suggest the simplest working solution, not the architecturally pure one.
2. **No tests, no CI, no staging.** Every change is operationally risky. Always confirm.
3. **The user prefers high autonomy:** show plan, build, let them review. Don't ask permission for every small step. But don't push without explicit "push it."
4. **Always state LOCAL vs PUSHED** after any change. The user often checks the GitHub Pages URL thinking it's updated when it's only on localhost.
5. **Always use `welcomematdigital.com`** for any URL shared with the user — never the raw `frontdesk-ai-vx1s.onrender.com`.
6. **The repo memory file `/memories/repo/welcomemat-playbook.md`** is the master strategy/brand/ops document. Consult it before substantive product decisions.
7. **The mockup IS the spec.** If `mockup.html` shows it, build it. If not, ask.
8. **Update memory files after each milestone.**
9. **Subscription tracker:** When any project adds a new paid service, domain, or API key, remind user to add it to the tracker (`subscriptions.html` in the parent `GitHub Copilot Fun Projects/` folder).
10. **API key paranoia:** If a key shows up in chat, warn the user and recommend regeneration.

---

## OpenAI cost reality

Per repo memory section 6 (Pricing & Unit Economics):
- Cost per customer at current usage: **~$0.50/mo OpenAI + ~$0.03/mo Google Places ≈ $0.53/mo**
- At scale (paid Render, higher OpenAI tier): **~$2-3/customer**
- Margin at $59/mo: ~99%

The free tier (2.5M tokens/day on `gpt-4o-mini`) is sufficient until traffic reaches roughly **5,000 conversations/day**, which is far beyond the realistic 6-month customer trajectory.

**Backlog items defensive:**
- OpenAI dashboard hard cap $100/mo + $50 email alert
- Scoped FrontDesk project with $20/mo cap + dedicated API key
- Per-customer tagging so the dashboard surfaces hot tenants

---

## Related: the "AI Enhance" admin tool

Admin reviews onboarding submissions in a UI that has a ✨ button on every field. Clicking it calls `POST /api/admin/ai/enhance` which polishes that field's text (e.g., turning rambling hours notes into "Mon–Fri 9–5, Sat 10–2, Sun closed").

The generated final system prompt comes from `POST /api/admin/ai/generate-prompt` which takes the edited form data and produces a draft. Admin can edit the draft before clicking "Approve & Create Business."

This admin AI assistance is **internal only** — never exposed to the end-customer.
