# 07 — Known Issues

> A running list of bugs, footguns, and dirty corners. If you fix one, mark it ✅ here.

---

## 🔴 Security / secrets

### Exposed secrets need rotation (HIGH)
All of these were leaked in chat history (May 21, 2026 per `welcomemat-playbook.md` section 9):
- [ ] `OPENAI_API_KEY`
- [ ] `TURSO_AUTH_TOKEN`
- [ ] `JWT_SECRET` (currently defaults to `change-me-in-production` if unset — **production fallback is unsafe**)
- [ ] `ADMIN_PASSWORD`
- [ ] `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY`
- [ ] `GOOGLE_PLACES_API_KEY`
- [ ] `RESEND_API_KEY`

**Action:** Rotate each in its provider dashboard, update Render env vars, never share keys in any future chat.

### `JWT_SECRET` has insecure fallback
`server/middleware/auth.js` line 3:
```js
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
```
If the env var is missing in production, the code silently uses a known string — every JWT issued is forgeable.
- **Mitigation:** Confirm `JWT_SECRET` is set in Render. Optionally hard-fail at boot if missing.

### `ADMIN_PASSWORD` is a single shared password
Per `server/routes/admin.js`. No user accounts. Acceptable at current scale but cannot support delegating admin access to anyone else.

### `ALLOWED_ORIGINS` is `*` in dev and a single env-var list in prod
`server/index.js` lines 12–20. No per-business CORS enforcement. Any site embedding the widget can hit any business's `/api/chat` if they know the `businessId`.

### `/api/upload` has no auth check (verify)
`server/routes/upload.js` line 39 — the route handler is defined directly; no `requireAuth` middleware is applied in the file as read. **Verify before exposing publicly.** Currently OK because no frontend exposes the endpoint, but anyone who finds the URL can upload to R2.

---

## 🟠 Functional bugs

### Plateau Kitchen seed code is dead but still runs (LOW–MED)
`server/index.js` (around line 73) seeds the `plateau-kitchen` business on first run, even though its frontend page was deleted May 21. This wastes a DB row and confuses new operators.
- **Fix:** Delete the seeding block.

### `render.yaml` says `plan: free` but production runs Starter
Out of sync with reality. If Render ever re-syncs `render.yaml` to the dashboard, it would downgrade the plan and re-introduce cold-start.
- **Fix:** Change `plan: free` → `plan: starter` in [render.yaml](../render.yaml).

### `.env.example` only documents 4 variables, runtime needs ~15
Anyone running locally for the first time will hit errors because `TURSO_AUTH_TOKEN`, `JWT_SECRET`, `ADMIN_PASSWORD`, `RESEND_API_KEY`, `NOTIFICATION_EMAIL`, `GOOGLE_PLACES_API_KEY`, `CF_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `BASE_URL` are all undocumented.
- **Fix:** Update `.env.example` per [04_ARCHITECTURE.md](04_ARCHITECTURE.md) env var table.

### "TRUSTED BY EASTSIDE FAMILIES" badge on Camellia site doesn't translate
Per `welcomemat-playbook.md` section 7 (Camellia remaining tasks). The badge text is missing a `data-i18n` attribute or its key isn't in the dictionaries.
- **File:** `public/sites/camellia-cleaning/index.html`

### Single global `NOTIFICATION_EMAIL` for all quote notifications
All quote requests email the same address regardless of business. At customer #2, the second owner won't see their own quotes.
- **Fix:** Add `owner_email` to `businesses` table; route to that.

### `better-sqlite3` in `package.json` but no longer used in runtime path
Adds ~6MB to `node_modules`. Confusing for new contributors.
- **Fix:** `npm uninstall better-sqlite3` after grepping the codebase to confirm nothing imports it.

### Resend sends from `onboarding@resend.dev` sandbox sender
Email deliverability suffers vs. a custom-domain sender. Some recipients may not see emails at all.
- **Fix:** Set up Resend custom domain for `welcomematdigital.com` (DNS records required). Add `hello@welcomematdigital.com` first (it's also referenced on public pages but doesn't exist).

### Multilingual translation drift on new pages
WelcomeMat holdco homepage (`public/index.html`) and Swoop page (`public/swoop/index.html`) **don't have full `es`/`pt` dictionaries** — they break i18n parity with the older `pitch.html` page.
- **Fix:** Wire `data-i18n` + add language dictionaries to both pages.

---

## 🟡 Design / UX patterns to enforce

### The "cards on same color bg" bug (REPEAT OFFENDER)
Documented in `welcomemat-playbook.md` section 4: **NEVER place same-color cards on same-color section backgrounds.** Has happened on Camellia site AND pitch page. The fix pattern:
- Tinted section bg + white cards, OR
- White section bg + tinted cards
- Minimum shadow always: `0 2px 8px rgba(0,0,0,0.07), 0 8px 24px rgba(0,0,0,0.05)`

### Nav transitions to white on scroll over dark hero
Logos with thin lines disappear. Rule: nav stays dark when hero is dark. Frosted glass: `rgba(15,23,42,0.95) + backdrop-filter: blur(16px)`.

### Logos thin-line at small sizes
Thin-stroke logos disappear at 36–48px header sizes. Use circular frame with accent border for non-square logos, or crop best element from business card.

### Language picker as abbreviation toggles (EN/PT/ES)
Users don't know language codes. Use dropdown with full names + flags: 🇺🇸 English, 🇧🇷 Português, 🇲🇽 Español.

### Chat widget overlap with bottom-right UI
Don't put important content in the bottom-right corner of any site. The widget bubble lives there.

### Per-demo cross-pollination of copy
Has happened multiple times (notary had cleaning copy, junk removal had landscaping services, locksmith had plant emoji). Fixed in commit `0d849e7`. Watch for repeats when copying templates.

---

## 🟢 Operational footguns

### No staging environment
`git push origin master` = production deploy in ~60 seconds (Render auto-deploy). There is no preview environment.
- **Mitigation:** Test on `localhost:3001` before push. Operating rule in repo memory: "make changes → commit locally → user reviews → THEN push."

### No tests
Zero automated test coverage. Manual testing only.

### No formal migration tool
`server/db/database.js` uses idempotent ALTER TABLE wrapped in try/catch. New columns added by appending to the `migrationCols` array. Renaming or dropping columns requires manual SQL.

### Custom domains require manual Render dashboard add
The Express code looks up domains in DB, but Render needs each custom domain added in its dashboard for SSL cert provisioning (Let's Encrypt). The two need to stay in sync.

### Photos in `public/sites/{slug}/photos/` are committed to git
Large binary blobs in the repo. At 5 customers × ~10 photos each, the repo grows fast.
- **Mitigation:** Move customer photos to R2 (upload route already exists). For now, manageable.

### In-memory rate limiter resets on restart
`server/routes/admin.js` line 13 uses `Map` for rate limiting. A Render restart (cold start, deploy, manual restart) wipes the limiter.
- **Acceptable** at current scale. Replace with Redis or Upstash if attack vector emerges.

### Cloudflare R2 bucket is private — relies on Express proxy
If Render goes down, no images load on any customer site (everything goes through `/api/upload/photos/...`). Single point of failure.
- **Alternative considered:** Public bucket with signed URLs. Not implemented.

### `git push --force` could rewrite shared history
The user's "always state LOCAL vs PUSHED" rule was added because the agent had previously pushed without review (commit `db9c9ca` and pitch.html redesign, May 21–22). Never push without explicit user confirmation.

---

## 🔵 Code smells (not bugs, but worth knowing)

- `server/index.js` mixes route mounting, custom domain logic, clean URLs, and demo seeding in one file (~120 lines)
- `server/routes/admin.js` is the largest route file — likely candidate to split when it grows further
- HTML files in `public/sites/{slug}/` and `public/demos/{slug}/` are full duplicates with copy-paste sections — no shared template engine yet (Phase 1 templatization deferred to customer #3)
- Lead-finder CLI tools mix tracking spreadsheet logic with API calls — could be split into discrete commands
- `named place-id-finder.html` exists at repo root with a space in the filename — purpose unclear; possibly stale

---

## ✅ Recently fixed (kept here for reference)

- ✅ Locksmith hero image broken (commit `cb109e3`, May 23)
- ✅ Locksmith CTA had landscaping copy (commit `67e5764`, May 23)
- ✅ Multiple demo cross-pollination bugs (commit `0d849e7`, May 23)
- ✅ Camellia widget pointing to wrong slug `plateau-kitchen` (commit `46280a2`, May 23)
- ✅ Swoop privacy missing explicit no-share clause for SMS opt-in (commit `5e3dc3c`, June 14)
- ✅ Swoop consent flow missing standalone Opt-In page (commit `c78ccc2`, June 4)
