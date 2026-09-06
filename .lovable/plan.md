## Eifo? — Map-first deals app for Tel Aviv

A mobile-first, map-first web app with a Google Maps-style light interface, floating UI cards, and neon pink/orange/purple accents. No backend, no auth — pure UI with mock data.

### Tech approach

- TanStack Start route at `/` renders a full-screen map.
- Use **Leaflet + react-leaflet** with the **CARTO Positron** light tiles (free, no API key, clean Google-Maps-like look). Avoids needing a Mapbox/Google key.
- Marker clustering via `react-leaflet-cluster` (custom-styled cluster circles in brand pink/orange).
- Custom pin markers rendered as `divIcon` so they pick up the brand gradient and venue category emoji.
- All copy in Hebrew, `dir="rtl"` on the root container.

### Design system (src/styles.css)

- Tokens: `--brand-navy` (near-black logo color), `--brand-pink`, `--brand-orange`, `--brand-purple`, plus a `--gradient-brand` (pink → orange) and `--gradient-brand-cool` (pink → purple).
- Soft shadow token `--shadow-float` for floating cards.
- Rounded radii (xl/2xl) for the floating UI.
- Rubik font (loaded via `<link>` in `__root.tsx` head) — strong Hebrew support, young Tel Aviv feel.

### Layout (single screen)

```
┌──────────────────────────────────────┐
│  [Logo Eifo?]      [Filter ⚙]        │ ← floating top bar
│  [🔍  חפש מקום או אזור...]            │ ← floating search
│                                       │
│           MAP (full-screen)           │
│        • pins  • cluster circles      │
│                                       │
│   [קורה עכשיו]  [לידי]                │ ← floating pill chips
│                                       │
│  ┌────────────────────────────────┐  │
│  │  Compact venue card placeholder │  │ ← bottom sheet
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### Components

- `src/components/EifoLogo.tsx` — wordmark "Eifo?". Rounded bold type, navy. A small location-pin SVG sits above the dot of the "i". A small "?" after the word filled with the pink→orange gradient. No pin inside the "o".
- `src/components/MapView.tsx` — Leaflet `MapContainer` centered on Tel Aviv (32.0853, 34.7818, zoom 14), Positron tiles, cluster group, custom pins.
- `src/components/FloatingSearch.tsx` — top floating search bar + logo + filter icon button.
- `src/components/QuickFilterChips.tsx` — "קורה עכשיו" (active by default, gradient bg) and "לידי" (white bg) pill buttons floating above the bottom card.
- `src/components/VenueBottomCard.tsx` — compact bottom sheet showing selected venue (name, category, deal text, distance, time window, CTA). Placeholder content when nothing selected: "בחר מקום במפה כדי לראות מבצע".
- `src/components/FilterSheet.tsx` — shadcn `Sheet` with mock filters (קטגוריה, סוג מבצע, מרחק) — UI only.
- `src/data/mockVenues.ts` — ~12 mock Tel Aviv venues with `{id, name, category, lat, lng, dealTitle, dealWindow, priceLevel, emoji}`. Spread across Florentin, Rothschild, Dizengoff, Neve Tzedek, Port, Sarona.

### Files to create / edit

- edit `src/routes/index.tsx` — replace placeholder with `<EifoApp />`, set Hebrew title + meta description.
- edit `src/routes/__root.tsx` — add Rubik `<link>` to head, set `<html lang="he" dir="rtl">`.
- edit `src/styles.css` — add brand tokens, gradient, shadow, RTL-friendly base.
- new `src/components/EifoApp.tsx` — composes the screen.
- new components listed above + `src/data/mockVenues.ts`.
- new `src/components/leaflet-setup.ts` — fixes default marker icon paths and exports custom `divIcon` factories.
- add deps: `leaflet`, `react-leaflet`, `react-leaflet-cluster`, plus `@types/leaflet`.
- import `leaflet/dist/leaflet.css` and `react-leaflet-cluster` CSS in `src/styles.css`.

### SSR note

Leaflet touches `window` at import time. `MapView` will be loaded client-only (dynamic import inside a `useEffect`-mounted wrapper, or guarded by `typeof window !== 'undefined'`) so SSR/prerender doesn't crash.

### Out of scope (per request)

No login, no profiles, no reviews, no extra routes, no backend.
