/**
 * Smart Pricing — per-venue, self-learning weak-hour discount engine.
 *
 * Core idea (from product spec): look at a venue's own performance by hour,
 * and recommend a bigger discount for its relatively weak hours and a smaller
 * one for its relatively strong hours — individually, per venue, updated
 * monthly, always subject to the business's approval before going live.
 *
 * This module is intentionally decoupled from where "performance" data comes
 * from. Today nothing feeds it real numbers yet, so `syntheticData.ts`
 * generates plausible hourly patterns to develop and sanity-check the
 * algorithm against. Later, real per-venue signals (Eifo view/click/
 * redemption events, and eventually POS data) plug into the exact same
 * `HourlyPerformance[]` shape — the algorithm doesn't change.
 */

/** One hour's worth of performance signal, for one calendar day. */
export type HourlyPerformance = {
  /** Local calendar date, "YYYY-MM-DD". */
  date: string;
  /** 0-23, the top of the hour. */
  hour: number;
  /**
   * Unitless demand/performance signal for this hour. Today: a synthetic
   * stand-in. Later: e.g. Eifo view/click/redemption counts, or real
   * covers/sales once a venue integrates a POS. Higher = busier.
   */
  performance: number;
};

/** Per-venue configuration a business owner sets (guardrails, not data). */
export type VenuePricingConfig = {
  venueId: string;
  /** Hours the venue is actually open; the engine never prices outside these. */
  openHours: number[];
  /** Business will never be recommended a discount above this, e.g. 20. */
  maxDiscountPct: number;
  /** Floor so the feature still feels "on" even in a strong hour, e.g. 0. */
  minDiscountPct: number;
  /**
   * Max change (percentage points) allowed between this month's live
   * discount and next month's recommendation, per hour — avoids a hand-off
   * that swings a business from 2% to 40% in one step.
   */
  maxMonthlyChangePct: number;
};

export const DEFAULT_PRICING_CONFIG: Omit<VenuePricingConfig, "venueId" | "openHours"> = {
  maxDiscountPct: 20,
  minDiscountPct: 0,
  maxMonthlyChangePct: 8,
};

/** The engine's output for one hour, pending business approval. */
export type HourlyRecommendation = {
  hour: number;
  /** Average performance for this hour over the rolling window used. */
  avgPerformance: number;
  /** This hour's performance relative to the venue's own best hour, 0-1. */
  relativeStrength: number;
  /** Recommended discount for next month, already guardrail-clamped. */
  recommendedDiscountPct: number;
  /** What's live today for this hour, if any — for showing the delta. */
  currentDiscountPct: number | null;
};

export type MonthlyRecommendation = {
  venueId: string;
  /** "YYYY-MM" the recommendation is FOR (i.e. next month). */
  forMonth: string;
  /** How many months of real history fed this (cold-start = 0). */
  monthsOfHistory: number;
  hours: HourlyRecommendation[];
  status: "pending_approval" | "approved" | "rejected";
};
