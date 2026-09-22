import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  generateDemoRecommendation,
  saveRecommendationDecision,
  listRecommendationDecisions,
  type PricingDecisionRow,
} from "@/lib/smartPricing/pricing.functions";
import type { MonthlyRecommendation } from "@/lib/smartPricing/types";

const ARCHETYPES = [
  { value: "restaurant", label: "מסעדה" },
  { value: "bar", label: "בר" },
  { value: "cafe", label: "בית קפה" },
] as const;

function fmtHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

export function PricingAdmin() {
  const generate = useServerFn(generateDemoRecommendation);
  const decide = useServerFn(saveRecommendationDecision);
  const listDecisions = useServerFn(listRecommendationDecisions);

  const [venueLabel, setVenueLabel] = useState("");
  const [archetype, setArchetype] = useState<"restaurant" | "bar" | "cafe">("restaurant");
  const [months, setMonths] = useState(3);
  const [rec, setRec] = useState<MonthlyRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<PricingDecisionRow[] | null>(null);

  const loadDecisions = () => {
    listDecisions()
      .then(setDecisions)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };
  useEffect(loadDecisions, []);

  const run = async () => {
    setError(null);
    setLoading(true);
    try {
      const label =
        venueLabel.trim() || `דמו: ${ARCHETYPES.find((a) => a.value === archetype)!.label}`;
      const result = await generate({ data: { venueLabel: label, archetype, months } });
      setRec(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const submit = async (status: "approved" | "rejected") => {
    if (!rec) return;
    setError(null);
    try {
      await decide({
        data: {
          venueLabel:
            venueLabel.trim() || `דמו: ${ARCHETYPES.find((a) => a.value === archetype)!.label}`,
          forMonth: rec.forMonth,
          monthsOfHistory: rec.monthsOfHistory,
          hours: rec.hours,
          status,
        },
      });
      setRec(null);
      loadDecisions();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl bg-[var(--surface)] p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-bold text-[var(--brand-navy)]">יצירת המלצת תמחור (דמו)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          עדיין אין דאטה אמיתי ממקומות — זה רץ על דאטה סינתטי, כדי שהמסך הזה יעבוד עד שיהיו מקומות
          עם היסטוריה אמיתית.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            value={venueLabel}
            onChange={(e) => setVenueLabel(e.target.value)}
            placeholder="שם/תווית למקום (אופציונלי)"
            className="rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--brand-pink)]"
          />
          <select
            value={archetype}
            onChange={(e) => setArchetype(e.target.value as typeof archetype)}
            className="rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm outline-none"
          >
            {ARCHETYPES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm outline-none"
          >
            {[1, 2, 3, 4, 6, 12].map((m) => (
              <option key={m} value={m}>
                {m} חודשי היסטוריה
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={run}
          disabled={loading}
          className="mt-3 rounded-xl bg-[image:var(--gradient-brand)] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {loading ? "מחשב..." : "צור המלצה"}
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      {rec && (
        <div className="rounded-2xl bg-[var(--surface)] p-4 shadow-sm ring-1 ring-black/5">
          <h3 className="text-sm font-bold text-[var(--brand-navy)]">
            המלצה ל-{rec.forMonth} ({rec.monthsOfHistory} חודשי היסטוריה)
          </h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[420px] text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="px-2 py-1 text-right">שעה</th>
                  <th className="px-2 py-1 text-right">חוזק יחסי</th>
                  <th className="px-2 py-1 text-right">היום</th>
                  <th className="px-2 py-1 text-right">מומלץ</th>
                </tr>
              </thead>
              <tbody>
                {rec.hours.map((h) => (
                  <tr key={h.hour} className="border-t border-black/5">
                    <td className="px-2 py-1 font-semibold">{fmtHour(h.hour)}</td>
                    <td className="px-2 py-1">{h.relativeStrength}</td>
                    <td className="px-2 py-1">{h.currentDiscountPct ?? 0}%</td>
                    <td className="px-2 py-1 font-bold text-[var(--brand-pink)]">
                      {h.recommendedDiscountPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => submit("approved")}
              className="rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-700"
            >
              אשר
            </button>
            <button
              onClick={() => submit("rejected")}
              className="rounded-full bg-red-50 px-4 py-1.5 text-xs font-bold text-red-700"
            >
              דחה
            </button>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-xs font-bold text-muted-foreground">החלטות קודמות</h3>
        {!decisions ? (
          <p className="text-xs text-muted-foreground">טוען...</p>
        ) : decisions.length === 0 ? (
          <p className="text-xs text-muted-foreground">עדיין אין החלטות שמורות.</p>
        ) : (
          <div className="space-y-2">
            {decisions.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-xl bg-[var(--surface)] px-4 py-2.5 text-xs shadow-sm ring-1 ring-black/5"
              >
                <span className="font-semibold text-[var(--brand-navy)]">{d.venue_label}</span>
                <span className="text-muted-foreground">{d.for_month}</span>
                <span
                  className={
                    "rounded-full px-2 py-0.5 font-bold " +
                    (d.status === "approved"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-50 text-red-700")
                  }
                >
                  {d.status === "approved" ? "אושר" : "נדחה"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
