import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listVenuesAdmin,
  setVenuePublished,
  deleteVenueAdmin,
  type VenueAdminRow,
} from "@/lib/admin/venues.functions";

export function VenuesAdmin() {
  const list = useServerFn(listVenuesAdmin);
  const publish = useServerFn(setVenuePublished);
  const remove = useServerFn(deleteVenueAdmin);

  const [rows, setRows] = useState<VenueAdminRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    list()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };

  useEffect(load, []);

  if (error) {
    return <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  }
  if (!rows) {
    return <p className="mt-4 text-sm text-muted-foreground">טוען מקומות...</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        אין עדיין מקומות ב-Supabase — הם יופיעו כאן ברגע שמישהו יוסיף מקום דרך האפליקציה.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {rows.map((v) => (
        <div
          key={v.id}
          className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface)] p-4 shadow-sm ring-1 ring-black/5"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--brand-navy)]">{v.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[v.area, v.category].filter(Boolean).join(" · ") || "—"}
            </p>
            {v.deal_description && (
              <p className="mt-1 truncate text-xs text-[var(--brand-pink)]">{v.deal_description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={
                "rounded-full px-2 py-1 text-[10px] font-bold " +
                (v.is_published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")
              }
            >
              {v.is_published ? "פורסם" : "ממתין"}
            </span>
            <button
              disabled={busyId === v.id}
              onClick={async () => {
                setBusyId(v.id);
                try {
                  await publish({ data: { id: v.id, isPublished: !v.is_published } });
                  load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusyId(null);
                }
              }}
              className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-[var(--brand-navy)] disabled:opacity-60"
            >
              {v.is_published ? "הסתר" : "פרסם"}
            </button>
            <button
              disabled={busyId === v.id}
              onClick={async () => {
                if (!confirm(`למחוק את "${v.name}"? אי אפשר לבטל.`)) return;
                setBusyId(v.id);
                try {
                  await remove({ data: { id: v.id } });
                  load();
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e));
                } finally {
                  setBusyId(null);
                }
              }}
              className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-60"
            >
              מחק
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
