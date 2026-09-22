# Smart Pricing — per-venue weak-hour discount engine

## The idea

Solve the "dead hours" problem *per business, automatically*: look at a
venue's own performance broken down by hour, and recommend a bigger
discount for its relatively weak hours and a smaller one for its relatively
strong hours — never compared to other venues, only to itself. Re-run every
month as new data comes in, so the schedule keeps adapting; always requires
the business's approval before a new schedule goes live.

This is deliberately closer to airline/hotel yield management than a
"post a coupon" feature — it's also the planned monetization wedge:
manual deal-posting (already built) stays free; an auto-optimizing schedule
with a monthly "here's what this brought you" report is the paid tier.

## Where it fits in the roadmap

Upgrades the "smart ranking / algorithm" phase — the ranking already live
in the app (`EifoApp.tsx`'s recommendation sort: active deal > distance >
rating) is a reasonable v0 for *which venues a user sees*. Smart Pricing is
a separate, second algorithm: *what discount a venue's hours should carry*.
Both eventually feed off the same event stream (see below).

## How it works

1. **Data source.** No POS integration in the MVP, so "performance" starts
   as Eifo's own signal for that venue/hour (views, clicks, and once it
   exists, redemption-code taps) — i.e. it runs on exactly the anonymous
   event log planned for the tracking phase. That tracking layer isn't just
   for personalization; it's the fuel for this engine too. Real POS/covers
   data can slot in later without changing the algorithm — it only ever
   consumes a plain `{date, hour, performance}` shape
   (`src/lib/smartPricing/types.ts`).
2. **Cold start.** A brand-new venue has no history. The engine blends a
   prior (business's own "which hours feel dead" guess at onboarding, or a
   category/area benchmark later) with real data, shifting weight to real
   data as it accumulates — full weight once ~3 months exist. This isn't
   throwaway scaffolding: every new venue that ever joins starts here.
3. **Monthly recommendation.** For each open hour: average performance
   over the history window → normalize against the venue's own best hour
   → map (inverted) to a discount between the business's configured floor
   and ceiling → clamp the change from last month to a max step size, so a
   handoff never swings from 2% to 40% in one go.
4. **Approval, not automation.** Output is `status: "pending_approval"`.
   Nothing goes live without the business confirming it, monthly — builds
   trust with the first pilot venues, matches the "keep it simple, human in
   the loop" posture from the product vision.
5. **Convergence.** Because discounts pull some demand into weak hours
   (modeled in the synthetic data as diminishing-returns uplift, stronger
   on already-weak hours), a few months of this loop should measurably
   flatten a venue's demand curve — not force every hour to peak level
   (structurally dead hours won't respond to any discount), but capture
   whatever incremental demand actually exists.

## What's built (`src/lib/smartPricing/`)

- `types.ts` — the data shapes (`HourlyPerformance`, `VenuePricingConfig`
  with the guardrails, `MonthlyRecommendation`).
- `algorithm.ts` — `computeMonthlyRecommendation()`, the pure function
  above. No Supabase/UI dependency — same function will run on real data
  later untouched.
- `syntheticData.ts` — plausible hourly demand shapes for a few venue
  archetypes (cafe/bar/restaurant), with noise and a discount-response
  model, so the algorithm has something realistic to run against before
  any real venue exists.
- `demo.ts` — runs a multi-month simulation (approve → apply → regenerate
  data → recompute), printing the recommendation table each month. Run
  with `npm run pricing:demo [cafe|bar|restaurant]`.

## Not built yet (needs a decision first, not just code)

- **Supabase schema** for real `HourlyPerformance` rows and stored
  `MonthlyRecommendation`s — waiting on the anonymous tracking phase to
  exist, since that's what will populate it.
- **Approval UI** for a business to review/tweak/approve next month's
  schedule.
- **The monthly job** that actually runs this per venue and notifies the
  business.
- Exact elasticity/uplift numbers here are for the synthetic demo only —
  not a claim about how real discounts move real demand.
