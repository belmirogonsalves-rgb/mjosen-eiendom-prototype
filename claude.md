# Mjøsen Eiendom – Redesign Prototype

## AI Skill Instructions
You are operating as a senior frontend engineer AND a UI/UX specialist with pro-level taste. This means:
- Write production-quality HTML, CSS, and JS — no placeholder lorem ipsum, no lazy markup
- Every visual decision must be intentional: spacing, type scale, color, layout rhythm
- UI must feel editorial and considered, not like a template
- Apply UX best practices: clear hierarchy, intuitive navigation, obvious CTAs, accessibility (alt text, semantic HTML, focus states)
- Push the design — don't default to safe. Scandinavian minimalism means restraint with confidence, not boringness
- All copy is in Norwegian. Do not use placeholder text.

## Project Overview
A visual prototype for the redesign of mjoseneiendom.no. The goal is to better present their property portfolio and position Mjøsen Eiendom as a more attractive, professional player in the Gjøvik commercial and residential rental market.

This is a **design/UX prototype only** — single HTML file, no backend, no CMS. All property data is loaded from a local JSON file.

---

## Tech Stack
- `src/index.html` — single page, all markup
- `src/styles.css` — all styling
- `src/script.js` — all interactivity
- `content/properties.json` — property data (mock, sourced from current site)
- **Leaflet.js** for map (loaded via CDN)
- **CartoDB Positron** tile layer (`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`) — clean, minimal, no API key required
- No frameworks. No build tools. No dependencies beyond Leaflet CDN.

---

## Typography
- **Titles/Headings:** `font-family: 'Neue Haas Grotesk', 'Helvetica Neue', Helvetica, Arial, sans-serif` — loaded via CSS stack, no Google Fonts needed. Use `font-weight: 500` for headings, `400` for subheadings.
- **Body/UI text:** `Manrope` — load via Google Fonts: `https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600&display=swap`
- Type scale (use CSS custom properties):
  - `--text-xs: 0.75rem` — labels, tags
  - `--text-sm: 0.875rem` — meta, captions
  - `--text-base: 1rem` — body
  - `--text-lg: 1.125rem` — card titles
  - `--text-xl: 1.5rem` — section headings
  - `--text-2xl: 2.25rem` — page headings
  - `--text-3xl: 3.5rem` — hero headline
- Letter spacing: headings `-0.02em`, body `0`, labels `0.06em` uppercase
- **Language:** Norwegian throughout
- **Aesthetic:** Scandinavian minimalist — inspired by selvaageiendom.no
- **Palette:** Light backgrounds, near-white or warm off-white (`#F7F6F3` or similar), dark charcoal text (`#1A1A1A`), one restrained accent color (e.g. deep forest green `#2D4A3E` or slate blue `#2B3A52`)
- **Typography:** Clean sans-serif. Use `Inter` via Google Fonts.
- **No gradients. No drop shadows unless very subtle. No stock-photo hero banners.**
- Generous whitespace. Let the properties breathe.
- Property cards should feel like editorial layout, not a real estate portal from 2012.

## Logo & Assets
- Logo: `assets/logo.png` — place in sticky header, left-aligned, max-height `40px`
- No other image assets exist. Use structured CSS placeholder blocks for property images:
  `background: var(--color-accent-light); display: flex; align-items: center; justify-content: center;` with a subtle label like "Bilde kommer"

---

### 1. Property Listing with Filtering
- Filter by type: `Kontor`, `Butikk/Næring`, `Leilighet`, `Hybel`
- Filter by availability: `Ledig nå` / `Alle`
- Clean card layout: address, type, sqm range, short description, status badge
- Clicking a card opens a simple detail view (can be a modal or inline expand)

### 2. Map-Based Property Discovery
- Leaflet map centered on Gjøvik centrum (~60.7954° N, 10.6917° E), zoom level 15
- CartoDB Positron tiles (light, minimal)
- Each property has a map pin; clicking pin highlights the corresponding card in the list
- Clicking a card highlights/opens its pin on the map
- Map and list are synchronized

### 3. Property Detail View
- Large image (or image placeholder if no photo available)
- Key specs in a clean data grid: Areal, Type, Renovert, Fasiliteter, Parkering
- Short description paragraph
- Simple CTA: "Ta kontakt" with contact name + phone number

### 4. Navigation / Header
- Logo / company name left-aligned
- Minimal nav: `Næring`, `Bolig`, `Om oss`, `Kontakt`
- Sticky header, clean line separator, no heavy bar

---

## Navigation
- Sticky header, `background: rgba(245,244,240,0.95)`, `backdrop-filter: blur(8px)`
- Logo left: `assets/logo.png`, max-height 40px
- Nav links right: `Næring`, `Bolig`, `Tjenester`, `Om oss`, `Kontakt`
- Active link: `color: var(--color-accent)`, bottom border `2px solid var(--color-accent)`
- Mobile: hamburger menu, full-screen overlay nav
- Phone number top-right: `930 20 001`

---
All data lives in `content/properties.json`. Structure per property:

```json
{
  "id": "storgata-10",
  "address": "Storgata 10, Gjøvik",
  "type": "Kontor",
  "sqm": "50–300 kvm",
  "status": "Ledig",
  "renovated": "2015",
  "parking": "30 innendørs, 20 utendørs",
  "facilities": ["Aircondition/Ventilasjon", "Alarm", "Bredbånd", "Heis"],
  "description": "Sentralt moderne kontorlokale i hjertet av Gjøvik sentrum.",
  "contact": {
    "name": "Christoffer Beck",
    "phone": "943 78 000",
    "email": "christoffer@mjoseneiendom.no"
  },
  "coordinates": [60.7954, 10.6917],
  "image": null
}
```

---

## Known Properties to Include (sourced from mjoseneiendom.no)
1. Storgata 1 — Leiligheter/hybler
2. Storgata 3 — Kontor (50–300 kvm)
3. Storgata 8 — Leiligheter/hybler + Butikklokale (450 kvm)
4. Storgata 10 — Kontor (50–300 kvm) + Block Watne
5. Tordenskioldsgate 11 — Leiligheter (2–4 roms)
6. NO10 Kontorhotell — Storgata 10, fleksibel kontorplass

> Coordinates for all properties should be approximated around Gjøvik sentrum. Exact pins can be refined later.

---

## What This Prototype Is NOT
- Not a live site
- No form submission logic
- No backend / database
- No authentication
- Do not add animations beyond simple CSS transitions (hover states, card expand)
- Do not use any JS framework (no React, no Vue)

---

## Claude Code Build Instructions
1. Read `content/content.md` first — all Norwegian copy is there
2. Read `content/properties.json` — all property data is there
3. Build order: `styles.css` → `index.html` → `script.js`
4. Use Leaflet CDN: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js` + CSS
5. Use CartoDB Positron tiles: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`
6. Default map center: `[60.7954, 10.6917]`, zoom `15`
7. Load Manrope from Google Fonts in `<head>`
8. Keep ALL code in `src/index.html`, `src/styles.css`, `src/script.js` — no additional files
9. Mobile responsive — use CSS Grid and Flexbox, no frameworks
10. Test that map + card sync works: card click → pan map to pin; pin click → scroll to card + highlight