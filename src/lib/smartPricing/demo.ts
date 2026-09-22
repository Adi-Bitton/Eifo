/**
 * Runs the smart-pricing engine against a few months of synthetic data for
 * one venue archetype, month by month — approving each recommendation and
 * feeding the resulting (discount-influenced) data back in, the same loop
 * the real product will run monthly. No real venue or Supabase needed.
 *
 * Usage: npm run pricing:demo [cafe|bar|restaurant]
 */
import { computeMonthlyRecommendation } from "./algorithm";
import { generateSyntheticMonth, type Archetype } from "./syntheticData";
import { DEFAULT_PRICING_CONFIG, type HourlyPerformance, type VenuePricingConfig } from "./types";

const OPEN_HOURS: Record<Archetype, number[]> = {
  cafe: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  bar: [16, 17, 18, 19, 20, 21, 22, 23, 0, 1],
  restaurant: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
};

function stddev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function coefficientOfVariation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return mean > 0 ? stddev(values) / mean : 0;
}

function fmtHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function run(archetype: Archetype, months = 6) {
  const openHours = OPEN_HOURS[archetype];
  const config: VenuePricingConfig = {
    venueId: `demo-${archetype}`,
    openHours,
    ...DEFAULT_PRICING_CONFIG,
  };

  let history: HourlyPerformance[] = [];
  let liveDiscounts: Partial<Record<number, number>> = {};

  console.log(`\n=== Smart Pricing demo — ${archetype} — ${months} months ===`);
  console.log(
    `(config: max ${config.maxDiscountPct}%, min ${config.minDiscountPct}%, ` +
      `±${config.maxMonthlyChangePct}pt/month)\n`,
  );

  for (let m = 1; m <= months; m++) {
    const monthData = generateSyntheticMonth({
      archetype,
      year: 2026,
      month: m,
      openHours,
      discountPctByHour: liveDiscounts,
      seed: 42,
    });
    history = [...history, ...monthData];

    const rec = computeMonthlyRecommendation({
      config,
      history,
      forMonth: `2026-${String(m + 1).padStart(2, "0")}`,
      currentDiscountPct: liveDiscounts,
    });

    const perfValues = rec.hours.map((h) => h.avgPerformance);
    const cv = coefficientOfVariation(perfValues);

    console.log(
      `--- Month ${m} actuals -> recommendation for month ${m + 1} ` +
        `(history: ${rec.monthsOfHistory}mo, demand evenness CV: ${cv.toFixed(2)}) ---`,
    );
    console.log("hour   | avg perf | relative | live%  -> next%");
    for (const h of rec.hours) {
      const live = h.currentDiscountPct ?? 0;
      console.log(
        `${fmtHour(h.hour)} | ${h.avgPerformance.toFixed(2).padStart(8)} | ` +
          `${h.relativeStrength.toFixed(2).padStart(8)} | ${String(live).padStart(3)}%   -> ${String(h.recommendedDiscountPct).padStart(3)}%`,
      );
    }
    console.log("");

    // "Business approves" — next month goes live with these discounts.
    liveDiscounts = Object.fromEntries(
      rec.hours.map((h) => [h.hour, h.recommendedDiscountPct]),
    );
  }
}

const arg = process.argv[2] as Archetype | undefined;
if (arg && !OPEN_HOURS[arg]) {
  console.error(`Unknown archetype "${arg}". Use one of: ${Object.keys(OPEN_HOURS).join(", ")}`);
  process.exit(1);
}
run(arg ?? "restaurant");
