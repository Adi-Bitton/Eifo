# Admin panel

A real, login-gated area for the two of you — not the old `?admin=1` URL
flag (still present in `EifoApp.tsx` for one unrelated legacy button; this
is a separate, actually-secured area).

## URLs

- `/admin/login` — email magic-link sign-in (Supabase Auth `signInWithOtp`).
- `/admin` — the dashboard (redirects to `/admin/login` if not signed in).
  Two tabs: **מקומות** (venues) and **תמחור חכם** (Smart Pricing).

## Who can get in

Supabase Auth's default `signInWithOtp` lets *anyone* request a magic link —
that's not the access boundary. The real boundary is server-side: every
admin server function is gated by `requireAdmin`
(`src/lib/admin/adminAuth.ts`), which validates the caller's Supabase
session token and then checks their email against `ADMIN_EMAILS` — a
server-only env var (comma-separated emails, no `VITE_` prefix, never
shipped to the client). Signing in with a non-allowlisted email gets you
past the login screen but every data call then fails with "Forbidden."

**Setup required before this works:** add real emails to `.env`:
```
ADMIN_EMAILS="adibitton22@gmail.com,partner@example.com"
```
Swap in the partner's actual email. Without this set, `requireAdmin`
refuses everyone (fails closed, not open).

## What's in each tab

- **מקומות** (`VenuesAdmin.tsx` + `venues.functions.ts`) — lists every venue
  in Supabase (published or not, unlike the public app), with
  publish/unpublish and delete. Straightforward moderation for what comes in
  through the public "הוספת מקום" form.
- **תמחור חכם** (`PricingAdmin.tsx` + `pricing.functions.ts`) — generates a
  Smart Pricing recommendation (still synthetic data — see
  `docs/SMART_PRICING.md`) for a picked venue archetype, shows the
  hour-by-hour table, and approve/reject persists it to
  `pricing_recommendations` with who decided and when.

## Before this works on your machine / in production

1. **Apply the new migration to the real Supabase project** — this repo's
   migration files aren't auto-applied; nothing here ran `supabase db
   push`. Either run it via the Supabase CLI, or paste
   `supabase/migrations/20260922162854_pricing_recommendations.sql` into
   the project's SQL editor in the Supabase dashboard.
2. **Set `ADMIN_EMAILS`** in `.env` (see above).
3. Supabase's default email sending has a low rate limit — fine for two
   people signing in occasionally; if magic links stop arriving, that's
   almost certainly why.

## Deliberately not built yet

- No route-level SSR auth guard — the `/admin` redirect is a client-side
  check (`supabase.auth.getSession()` after mount). Fine for an internal
  tool used by two people; the actual security boundary is server-side
  (`requireAdmin` on every data call) regardless.
- No UI to edit a venue's fields (only publish/unpublish/delete) — full
  editing already exists via the public "הוספת מקום" sheet's edit mode.
- No pagination on the venues list — fine at today's scale, revisit once
  there are real numbers of venues.
