import type {
  HourlyPerformance,
  HourlyRecommendation,
  MonthlyRecommendation,
  VenuePricingConfig,
} from "./types";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function distinctMonths(rows: HourlyPerformance[]): number {
  return new Set(rows.map((r) => r.date.slice(0, 7))).size;
}

/** Average performance per hour, across every day in `history`. */
function avgPerformanceByHour(
  history: HourlyPerformance[],
  openHours: number[],
): Map<number, number> {
  const sums = new Map<number, { total: number; n: number }>();
  for (const h of openHours) sums.set(h, { total: 0, n: 0 });
  for (const row of history) {
    const bucket = sums.get(row.hour);
    if (!bucket) continue; // ignore hours outside openHours
    bucket.total += row.performance;
    bucket.n += 1;
  }
  const out = new Map<number, number>();
  for (const [hour, { total, n }] of sums) out.set(hour, n > 0 ? total / n : 0);
  return out;
}

/**
 * Turn a venue's own hourly performance history into next month's discount
 * recommendation, one row per open hour. Relatively weak hours (for THIS
 * venue, against its own best hour — never compared across venues) get
 * pushed toward maxDiscountPct; relatively strong hours toward
 * minDiscountPct. See types.ts for the guardrails this respects.
 *
 * `coldStartWeights` (optional): a 0-1 "how dead does this feel" guess per
 * hour — from the business's own onboarding input, or a category/area
 * benchmark — used only when there isn't real history yet (or to blend in
 * while history is still thin). 1 = busiest, 0 = deadest, same scale as the
 * relative-strength score the real data produces.
 */
export function computeMonthlyRecommendation(params: {
  config: VenuePricingConfig;
  history: HourlyPerformance[];
  forMonth: string;
  currentDiscountPct?: Partial<Record<number, number>>;
  coldStartWeights?: Partial<Record<number, number>>;
}): MonthlyRecommendation {
  const { config, history, forMonth, currentDiscountPct = {}, coldStartWeights } = params;
  const { openHours, maxDiscountPct, minDiscountPct, maxMonthlyChangePct } = config;

  const monthsOfHistory = distinctMonths(history);
  const avgByHour = avgPerformanceByHour(history, openHours);
  const maxAvg = Math.max(0, ...Array.from(avgByHour.values()));

  // Blend real data with the cold-start prior while history is thin — full
  // weight on real data once we have 3+ months of it, per the spec's "starts
  // from a 1-3 month average, and shifts a lot as the app keeps running."
  const realDataWeight = clamp(monthsOfHistory / 3, 0, 1);

  const hours: HourlyRecommendation[] = openHours
    .slice()
    .sort((a, b) => a - b)
    .map((hour) => {
      const avgPerformance = avgByHour.get(hour) ?? 0;
      const dataStrength = maxAvg > 0 ? avgPerformance / maxAvg : 0.5;
      const priorStrength = coldStartWeights?.[hour] ?? 0.5;
      const relativeStrength =
        monthsOfHistory > 0
          ? realDataWeight * dataStrength + (1 - realDataWeight) * priorStrength
          : priorStrength;

      const rawDiscount =
        maxDiscountPct - relativeStrength * (maxDiscountPct - minDiscountPct);

      const current = currentDiscountPct[hour];
      const rateLimited =
        current == null
          ? rawDiscount
          : clamp(rawDiscount, current - maxMonthlyChangePct, current + maxMonthlyChangePct);

      const recommendedDiscountPct = Math.round(
        clamp(rateLimited, minDiscountPct, maxDiscountPct),
      );

      return {
        hour,
        avgPerformance: Math.round(avgPerformance * 100) / 100,
        relativeStrength: Math.round(relativeStrength * 100) / 100,
        recommendedDiscountPct,
        currentDiscountPct: current ?? null,
      };
    });

  return {
    venueId: config.venueId,
    forMonth,
    monthsOfHistory,
    hours,
    status: "pending_approval",
  };
}
