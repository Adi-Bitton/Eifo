import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/adminAuth";
import { computeMonthlyRecommendation } from "./algorithm";
import { ARCHETYPE_OPEN_HOURS, generateSyntheticMonth, type Archetype } from "./syntheticData";
import {
  DEFAULT_PRICING_CONFIG,
  type HourlyPerformance,
  type MonthlyRecommendation,
} from "./types";

const ARCHETYPES = ["cafe", "bar", "restaurant"] as const;

/**
 * Runs the same approve -> apply -> regenerate loop as `demo.ts`, server-side,
 * and returns only the final month's recommendation — this is what the admin
 * "Smart Pricing" tab calls when there's no real venue history yet. Nothing
 * is persisted here; persistence happens only on an explicit decision, via
 * `saveRecommendationDecision` below.
 */
export const generateDemoRecommendation = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(
    z.object({
      venueLabel: z.string().min(1).max(120),
      archetype: z.enum(ARCHETYPES),
      months: z.number().int().min(1).max(12).default(3),
    }),
  )
  .handler(async ({ data }): Promise<MonthlyRecommendation> => {
    const openHours = ARCHETYPE_OPEN_HOURS[data.archetype as Archetype];
    const config = {
      venueId: data.venueLabel,
      openHours,
      ...DEFAULT_PRICING_CONFIG,
    };

    let history: HourlyPerformance[] = [];
    let liveDiscounts: Partial<Record<number, number>> = {};
    let rec: MonthlyRecommendation | undefined;

    for (let m = 1; m <= data.months; m++) {
      const monthData = generateSyntheticMonth({
        archetype: data.archetype as Archetype,
        year: 2026,
        month: m,
        openHours,
        discountPctByHour: liveDiscounts,
        seed: 42,
      });
      history = [...history, ...monthData];
      rec = computeMonthlyRecommendation({
        config,
        history,
        forMonth: `demo-month-${m + 1}`,
        currentDiscountPct: liveDiscounts,
      });
      liveDiscounts = Object.fromEntries(rec.hours.map((h) => [h.hour, h.recommendedDiscountPct]));
    }

    // months is >= 1 so the loop always runs at least once.
    return rec!;
  });

export const saveRecommendationDecision = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(
    z.object({
      venueLabel: z.string().min(1).max(120),
      forMonth: z.string().min(1),
      monthsOfHistory: z.number().int().min(0),
      hours: z.array(
        z.object({
          hour: z.number().int().min(0).max(23),
          avgPerformance: z.number(),
          relativeStrength: z.number(),
          recommendedDiscountPct: z.number(),
          currentDiscountPct: z.number().nullable(),
        }),
      ),
      status: z.enum(["approved", "rejected"]),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("pricing_recommendations" as never).insert({
      venue_label: data.venueLabel,
      for_month: data.forMonth,
      months_of_history: data.monthsOfHistory,
      hours: data.hours,
      status: data.status,
      decided_by: context.adminEmail,
      decided_at: new Date().toISOString(),
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type PricingDecisionRow = {
  id: string;
  created_at: string;
  venue_label: string;
  for_month: string;
  months_of_history: number;
  hours: MonthlyRecommendation["hours"];
  status: "pending_approval" | "approved" | "rejected";
  decided_by: string | null;
  decided_at: string | null;
};

export const listRecommendationDecisions = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<PricingDecisionRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("pricing_recommendations" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as PricingDecisionRow[];
  });
