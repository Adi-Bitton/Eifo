import type { HourlyPerformance } from "./types";

/**
 * Relative demand shape by hour (0-1, not tied to any unit) for a few venue
 * archetypes — just enough shape to exercise the algorithm against
 * realistic-looking peaks and dead zones before any real venue data exists.
 * Hours not listed default to a low baseline.
 */
const ARCHETYPE_SHAPES: Record<string, Partial<Record<number, number>>> = {
  cafe: {
    8: 0.55, 9: 0.75, 10: 0.85, 11: 0.7,
    12: 0.9, 13: 1.0, 14: 0.6,
    15: 0.35, 16: 0.3, 17: 0.3,
    18: 0.4, 19: 0.35, 20: 0.25,
  },
  bar: {
    16: 0.15, 17: 0.25, 18: 0.4,
    19: 0.5, 20: 0.6, 21: 0.85,
    22: 1.0, 23: 0.95, 0: 0.7, 1: 0.4,
  },
  restaurant: {
    12: 0.65, 13: 0.85, 14: 0.55,
    15: 0.2, 16: 0.15, 17: 0.2,
    18: 0.45, 19: 0.8, 20: 1.0, 21: 0.9, 22: 0.55,
  },
};

export type Archetype = keyof typeof ARCHETYPE_SHAPES;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One synthetic month of daily-by-hour performance for a venue.
 *
 * `discountPctByHour` (optional): the discount schedule that was actually
 * live during this month, so we can model demand responding to it — every
 * point of discount nudges that hour's performance up, with diminishing
 * returns. Elasticity is deliberately higher for hours that start weaker
 * (a struggling hour is easier to move than an already-busy one), which is
 * what lets the simulation show the curve flattening over a few months
 * instead of just adding noise.
 */
export function generateSyntheticMonth(params: {
  archetype: Archetype;
  year: number;
  month: number; // 1-12
  openHours: number[];
  discountPctByHour?: Partial<Record<number, number>>;
  seed?: number;
}): HourlyPerformance[] {
  const { archetype, year, month, openHours, discountPctByHour, seed = 1 } = params;
  const shape = ARCHETYPE_SHAPES[archetype];
  const rand = mulberry32(seed + year * 100 + month);
  const daysInMonth = new Date(year, month, 0).getDate();

  const rows: HourlyPerformance[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    for (const hour of openHours) {
      const base = shape[hour] ?? 0.15;
      const discount = discountPctByHour?.[hour] ?? 0;
      // Diminishing-returns uplift, stronger effect on already-weak hours.
      const elasticity = 1.8 * (1 - base);
      const uplift = 1 + (discount / 100) * elasticity;
      const noise = 0.85 + rand() * 0.3; // ±15%
      const performance = Math.round(base * uplift * noise * 100) / 100;
      rows.push({ date, hour, performance });
    }
  }
  return rows;
}
