import { Search, SlidersHorizontal, MapPin, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EifoLogo } from "./EifoLogo";
import { FilterChipRow, type ChipKey } from "./FilterChipRow";
import { ThemeToggle } from "./ThemeToggle";
import { type Theme } from "@/lib/theme";
import { type Venue } from "@/data/mockVenues";

type Props = {
  onOpenFilters: () => void;
  activeChips: Set<ChipKey>;
  onToggleChip: (k: ChipKey) => void;
  onAddPlace: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  results: Venue[];
  onSelectResult: (v: Venue) => void;
  onOpenMore?: () => void;
  moreActiveCount?: number;
  view?: "map" | "list";
  onToggleView?: () => void;
};

export function FloatingSearch({
  onOpenFilters,
  activeChips,
  onToggleChip,
  onAddPlace,
  theme,
  onToggleTheme,
  query,
  onQueryChange,
  results,
  onSelectResult,
  onOpenMore,
  moreActiveCount,
  view,
  onToggleView,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when expanding.
  useEffect(() => {
    if (expanded) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [expanded]);

  // Click-outside collapses (only when there's no active query, to avoid
  // losing the user's typed text accidentally).
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setFocused(false);
        if (!query.trim()) setExpanded(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [query]);

  const trimmed = query.trim();
  const dropdownOpen = expanded && focused && trimmed.length > 0;
  const visible = results.slice(0, 8);

  const pick = (v: Venue) => {
    onSelectResult(v);
    setFocused(false);
    setExpanded(false);
  };

  const collapse = () => {
    onQueryChange("");
    setFocused(false);
    setExpanded(false);
  };

  return (
    <div data-top-header className="pointer-events-none absolute inset-x-0 top-0 z-[500] px-3 pt-[max(env(safe-area-inset-top),10px)]">
      <div className="pointer-events-auto mx-auto flex max-w-md flex-col gap-2.5">
        {/* Search row — expandable pill */}
        <div ref={wrapRef} className="relative">
          <div className="flex items-center gap-2">
            {!expanded ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                dir="rtl"
                aria-label="פתח חיפוש"
                className="flex h-12 flex-1 animate-fade-in items-center justify-between gap-3 rounded-full bg-[var(--surface)]/90 px-4 shadow-[0_4px_14px_-6px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.04] backdrop-blur-xl transition active:scale-[.98]"
              >
                <EifoLogo size={18} />
                <span className="min-w-0 flex-1 truncate text-center text-[14px] font-normal text-[var(--brand-navy)]/60">
                  מה שווה עכשיו בתל אביב?
                </span>
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={collapse}
                  aria-label="סגור חיפוש"
                  className="grid h-10 w-10 shrink-0 animate-fade-in place-items-center rounded-xl bg-[var(--surface)]/90 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.15)] ring-1 ring-black/[0.05] backdrop-blur-xl transition active:scale-95"
                >
                  <ArrowRight className="h-4 w-4 text-[var(--brand-navy)]" />
                </button>
                <div className="flex flex-1 animate-scale-in items-center gap-2 rounded-xl bg-[var(--surface)]/95 px-3.5 py-2 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.15)] ring-1 ring-black/[0.05] backdrop-blur-xl">
                  <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    dir="rtl"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && visible.length > 0) {
                        e.preventDefault();
                        pick(visible[0]);
                      } else if (e.key === "Escape") {
                        collapse();
                      }
                    }}
                    placeholder="חפש מקום, שכונה או מטבח…"
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--brand-navy)] outline-none placeholder:font-normal placeholder:text-muted-foreground"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => onQueryChange("")}
                      className="text-xs text-muted-foreground hover:text-[var(--brand-navy)]"
                      aria-label="נקה חיפוש"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  onClick={onOpenFilters}
                  aria-label="פילטרים"
                  className="grid h-10 w-10 shrink-0 animate-fade-in place-items-center rounded-xl bg-[var(--surface)]/90 shadow-[0_4px_16px_-8px_rgba(15,23,42,0.15)] ring-1 ring-black/[0.05] backdrop-blur-xl transition active:scale-95"
                >
                  <SlidersHorizontal className="h-4 w-4 text-[var(--brand-navy)]" />
                </button>
              </>
            )}
            {!expanded && (
              <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            )}
          </div>

          {dropdownOpen && (
            <div
              dir="rtl"
              className="absolute inset-x-0 top-full z-[600] mt-2 animate-fade-in overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-float)] ring-1 ring-black/10"
            >
              {visible.length === 0 ? (
                <p className="px-4 py-4 text-center text-sm font-semibold text-muted-foreground">
                  לא נמצאו מקומות מתאימים
                </p>
              ) : (
                <ul className="max-h-[60vh] overflow-y-auto">
                  {visible.map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => pick(v)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-right transition hover:bg-black/[.04]"
                      >
                        <div
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl"
                          style={{
                            backgroundImage:
                              "linear-gradient(135deg, color-mix(in oklab, var(--brand-pink) 15%, white), color-mix(in oklab, var(--brand-orange) 15%, white))",
                          }}
                        >
                          {v.emoji || "📍"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-bold text-[var(--brand-navy)]">
                              {v.name}
                            </span>
                            <span className="shrink-0 rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              {v.category}
                            </span>
                            {v.active !== false && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            )}
                          </div>
                          {(v.area || v.address) && (
                            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {v.area || v.address}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Chip row */}
        <FilterChipRow
          active={activeChips}
          onToggle={onToggleChip}
          onAddPlace={onAddPlace}
          onOpenMore={onOpenMore}
          moreActiveCount={moreActiveCount}
          view={view}
          onToggleView={onToggleView}
        />
      </div>
    </div>
  );
}
