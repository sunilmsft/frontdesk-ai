# WelcomeMat Demo Archetype Summary

> **⚠️ STATUS: EXPLORATION PROTOTYPES — NOT PRODUCTION TEMPLATES**
> These are rough, disposable concept demos built to stress-test the DNA axis system. They use placeholder copy, stock photos, and hardcoded CSS. Nothing here is deployment-ready, templatized, or meant to be shipped as-is. Treat them as visual sketches, not blueprints.

## Exercise: 4 Demo Sites for Different SMB Verticals
Created 4 lightweight prototypes to validate that the WelcomeMat DNA axis system produces genuinely distinct visual identities without becoming a custom agency.

---

## Archetypes Explored

| # | Demo | Archetype | Layout | Typography | Shapes | Animation | Icons | Accent |
|---|------|-----------|--------|-----------|--------|-----------|-------|--------|
| 0 | Camellia (ref) | Soft & Trustworthy | warm-organic | serif-elegant | rounded | subtle-rise | lucide-outline | #c4b5a0 |
| 1 | Evergreen Grounds | Rugged & Reliable | stacked-bold | slab-bold (Bitter) | sharp (4px) | scale-pop | phosphor-fill | #4a7c23 |
| 2 | Studio Miel | Premium & Minimal | editorial | geometric (Poppins) | mixed (2px) | none | text-only | #c9956b |
| 3 | Ironclad Home Svcs | Energetic & Modern | clean-grid | sans-modern (Outfit) | sharp (4px) | slide-stagger | custom-blob gradient | #e85d04 |
| 4 | Casa Oaxaca | Warm & Familial | warm-organic | hand-friendly (Caveat+Nunito) | organic (wavy, blob) | subtle-rise | emoji-native | #c2553a |

---

## What Created the Strongest Differentiation

1. **Typography pairing is the #1 differentiator.** Swapping fonts changed the entire emotional register more than any other axis. Bitter+Source Sans (landscaping) vs. Caveat+Nunito (restaurant) vs. Poppins+Work Sans (salon) — each reads as a completely different brand tier.

2. **Icon strategy matters more than expected.** Emoji-native (restaurant) feels warm and approachable. Text-only (salon) feels premium. Phosphor-fill (landscaping) feels utilitarian. Custom blob gradients (handyman) feel energetic. This axis alone shifts perceived professionalism level.

3. **Hero layout is the instant first impression.** Diagonal clip (handyman), editorial split (salon), full-bleed photo with bottom text (restaurant), stacked-bold full-width (landscaping) — visitors register these patterns in <1 second and form an opinion.

4. **Color alone isn't enough.** Forest green and orange both feel "service business," but when paired with different shapes and typography they diverge completely. Color is necessary but not sufficient.

---

## What Remained Reusable (Core Template DNA)

These patterns were nearly identical across all 4 demos and should become the **shared skeleton**:

- **Section structure**: tag/label → h2 → subtitle → content grid (every demo uses this)
- **Nav pattern**: fixed top bar, logo left, links right, CTA button far-right
- **Mobile breakpoint logic**: nav links hidden, single-column stack, reduced padding
- **CTA banner pattern**: dark/gradient background, centered heading + subtext + buttons
- **Footer**: minimal, one-liner with "Powered by WelcomeMat"
- **Service card grid**: auto-fit minmax grid, hover lift, consistent padding
- **Image lazy loading**: all demos use `loading="lazy"` on gallery images
- **Font loading**: all use Google Fonts preconnect pattern

---

## What Felt Too Custom (Danger Zone)

These elements required per-site creative decisions that can't easily be parameterized:

- **Copywriting voice**: Ironclad's blunt "No excuses, no callbacks" vs. Casa Oaxaca's warm "Taste Oaxaca, feel home" — tone requires human input or AI prompt tuning
- **Section ordering**: Restaurant puts Story before Menu (story-first). Handyman puts How It Works after Services (process-first). Salon leads with gallery (visual-first). This ordering reflects business strategy, not just aesthetics.
- **Unique layout elements**: Wavy SVG divider (restaurant), diagonal clip-path (handyman), overlapping editorial gallery (salon), masonry layout (landscaping) — each required custom CSS
- **About section format**: Circular portrait (salon) vs. offset-bordered photo (landscaping) vs. accent-bordered rectangle (handyman) vs. shadowed + rotated frame (restaurant)
- **Before/after labeling**: Handyman-specific. Doesn't apply to restaurant or salon.

---

## What Should Become Configurable Knobs

### Tier 1: Must-have (covers 80% of differentiation)
- **Font pairing** — dropdown of 5-6 curated pairs (serif-elegant, slab-bold, geometric, sans-modern, hand-friendly)
- **Accent color** — single color picker (system auto-generates light/hover/dark variants)
- **Border radius** — slider: 0px → 4px → 12px → 24px (sharp → rounded → pill)
- **Icon style** — radio: lucide-outline / phosphor-fill / emoji / text-only / blob-gradient

### Tier 2: High impact, moderate complexity
- **Hero layout** — select: stacked-bold / editorial-split / diagonal-clip / full-bleed-bottom
- **Animation preset** — select: none / subtle-rise / scale-pop / slide-stagger
- **Section order** — drag-and-drop reorder of: hero, story, services, gallery, how-it-works, hours, CTA

### Tier 3: Nice-to-have (for power users / done-for-them tier)
- **Divider style** — select: none / wavy / diagonal / straight-line
- **Gallery layout** — select: grid / masonry / editorial-overlap / organic-offset
- **About photo treatment** — select: circular / rectangular / offset-shadow / accent-border

---

## Patterns to Document in DNA/Playbook

1. **"5 Axes, 1600 Combos" is validated** — 4 demos + Camellia prove that varying all 5 axes simultaneously produces sites that look nothing alike. No two could be mistaken for each other.

2. **Font pairing library needed** — Curate 6-8 pairs with emotional labels: "warm-trustworthy" (Lora+Open Sans), "bold-trade" (Bitter+Source Sans), "premium-minimal" (Poppins+Work Sans), "modern-energetic" (Outfit+Inter), "friendly-familial" (Caveat+Nunito), "clean-corporate" (DM Sans+Inter).

3. **Section blocks as components** — Each section (hero, services, about, gallery, hours, CTA, how-it-works) should be an independent HTML partial that can be included/excluded and reordered.

4. **Content templates per vertical** — Pre-written placeholder copy for: cleaning, landscaping, salon, handyman, restaurant, auto repair, tutoring, pet services. Reduces onboarding friction from blank-page to fill-in-the-blanks.

5. **Color system is 1 input → 5 outputs** — Given one accent color, auto-generate: accent, accent-hover, accent-light, primary (dark complement), bg-alt (warm/cool tint of cream). This worked consistently across all 4 demos.

6. **Restaurant-specific: hours block + reservation CTA** — Verticals have unique blocks. System should support optional vertical-specific sections.

---

## Files Created

- `public/demos/landscaping/index.html` — Evergreen Grounds (Rugged & Reliable)
- `public/demos/salon/index.html` — Studio Miel (Premium & Minimal)
- `public/demos/handyman/index.html` — Ironclad Home Services (Energetic & Modern)
- `public/demos/restaurant/index.html` — Casa Oaxaca (Warm & Familial)

All local only. Not committed or deployed.
