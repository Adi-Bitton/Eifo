import { Navigation, Plus, SlidersHorizontal, Map, List } from "lucide-react";

export type ChipKey =
  | "now"
  | "near"
  | "food"
  | "drink"
  | "coffee"
  | "cheap"
  | "date"
  | "friends"
  | "beach";

const CHIPS: { key: ChipKey; label: string; emoji?: string }[] = [
  { key: "near", label: "לידי" },
  { key: "food", label: "אוכל", emoji: "🍽️" },
  { key: "drink", label: "דרינק", emoji: "🍸" },
  { key: "coffee", label: "קפה", emoji: "☕" },
  { key: "date", label: "דייט", emoji: "💕" },
  { key: "friends", label: "חברים", emoji: "👯" },
  { key: "cheap", label: "זול", emoji: "💸" },
  { key: "beach", label: "ליד הים", emoji: "🌊" },
];

type Props = {
  active: Set<ChipKey>;
  onToggle: (k: ChipKey) => void;
  onAddPlace: () => void;
  onOpenMore?: () => void;
  moreActiveCount?: number;
  view?: "map" | "list";
  onToggleView?: () => void;
};

export function FilterChipRow({
  active,
  onToggle,
  onAddPlace,
  onOpenMore,
  moreActiveCount = 0,
  view,
  onToggleView,
}: Props) {
  return (
    <div
      dir="rtl"
      className="pointer-events-auto -mx-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex w-max items-center gap-1.5">
        {onToggleView && (
          <button
            onClick={onToggleView}
            aria-label={view === "list" ? "עבור למפה" : "עבור לרשימה"}
            className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--brand-navy)] px-3 py-1.5 text-[12px] font-semibold text-white dark:bg-zinc-800 dark:text-gray-100 dark:ring-1 dark:ring-zinc-700 shadow-[0_2px_8px_-4px_rgba(15,23,42,0.35)] transition active:scale-95"
          >
            {view === "list" ? (
              <>
                <Map className="h-3.5 w-3.5" />
                מפה
              </>
            ) : (
              <>
                <List className="h-3.5 w-3.5" />
                רשימה
              </>
            )}
          </button>
        )}

        {/* Active-now primary chip */}
        <button
          onClick={() => onToggle("now")}
          className={
            "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 transition active:scale-95 " +
            (active.has("now")
              ? "bg-emerald-500 text-white ring-transparent shadow-[0_2px_8px_-2px_rgba(16,185,129,0.45)]"
              : "bg-white/90 text-[var(--brand-navy)] ring-black/[0.06] shadow-[0_2px_8px_-4px_rgba(15,23,42,0.12)] backdrop-blur-md dark:bg-zinc-800 dark:text-gray-100 dark:ring-zinc-700")
          }
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white" />
          </span>
          פעיל עכשיו
        </button>


        {CHIPS.map((c) => {
          const isActive = active.has(c.key);
          const icon =
            c.key === "near" ? <Navigation className="h-3 w-3" /> : null;
          return (
            <button
              key={c.key}
              onClick={() => onToggle(c.key)}
              className={
                "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium ring-1 transition active:scale-95 " +
                (isActive
                  ? "bg-[image:var(--gradient-brand)] text-white ring-transparent shadow-[0_2px_8px_-2px_rgba(236,72,153,0.35)] opacity-95"
                  : "bg-white/85 text-[var(--brand-navy)]/80 ring-black/[0.06] shadow-[0_2px_8px_-4px_rgba(15,23,42,0.12)] backdrop-blur-md dark:bg-zinc-800 dark:text-gray-100 dark:ring-zinc-700")
              }
            >
              {icon}
              {c.emoji && <span className="text-[13px] leading-none">{c.emoji}</span>}
              {c.label}
            </button>
          );
        })}

        {onOpenMore && (
          <button
            onClick={onOpenMore}
            className={
              "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium ring-1 transition active:scale-95 " +
              (moreActiveCount > 0
                ? "bg-[var(--brand-navy)] text-white ring-transparent dark:bg-zinc-700 dark:text-gray-100 dark:ring-zinc-600"
                : "bg-white/85 text-[var(--brand-navy)]/80 ring-black/[0.06] shadow-[0_2px_8px_-4px_rgba(15,23,42,0.12)] backdrop-blur-md dark:bg-zinc-800 dark:text-gray-100 dark:ring-zinc-700")
            }
          >
            <SlidersHorizontal className="h-3 w-3" />
            עוד סינונים
            {moreActiveCount > 0 && (
              <span className="ms-0.5 rounded-full bg-white/25 px-1.5 py-0 text-[10px] font-bold">
                {moreActiveCount}
              </span>
            )}
          </button>
        )}

        <span className="mx-1 h-4 w-px shrink-0 bg-black/10 dark:bg-white/15" />

        <button
          onClick={onAddPlace}
          className="flex shrink-0 items-center gap-1 rounded-full bg-white/70 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground ring-1 ring-black/[0.06] backdrop-blur-md dark:bg-zinc-800 dark:text-gray-100 dark:ring-zinc-700 transition active:scale-95 hover:text-[var(--brand-navy)]"
        >
          <Plus className="h-3 w-3" strokeWidth={2.5} />
          הוסף מקום
        </button>
      </div>
    </div>
  );
}
