import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { type Venue } from "@/data/mockVenues";
import { usePlaces } from "@/lib/places";
import { useTheme } from "@/lib/theme";
import { FloatingSearch } from "./FloatingSearch";
import { type ChipKey } from "./FilterChipRow";
import { VenueBottomCard } from "./VenueBottomCard";
import { AddPlaceSheet } from "./AddPlaceSheet";
import { MoreFiltersSheet } from "./MoreFiltersSheet";
import { VenueList } from "./VenueList";
import { VenueCarousel } from "./VenueCarousel";
import { getCategoryKeys, pickPrimaryDeal, isAnyDealActiveNow } from "@/lib/venueDeals";
import { venueMatchesTag } from "@/lib/secondaryTags";


function matchesChips(v: Venue, chips: Set<ChipKey>, now: Date): boolean {
  const cats = new Set(getCategoryKeys(v));
  for (const c of chips) {
    if (c === "now") {
      if (!isAnyDealActiveNow(v, now)) return false;
      continue;
    }
    if (c === "near") continue; // UI-only
    if (!cats.has(c)) return false;
  }
  return true;
}


function matchesTags(v: Venue, tags: Set<string>): boolean {
  if (tags.size === 0) return true;
  for (const t of tags) {
    if (!venueMatchesTag(v, t)) return false;
  }
  return true;
}

function matchesQuery(v: Venue, q: string): boolean {
  if (!q) return true;
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const cats = getCategoryKeys(v).join(" ");
  const deals = (v.deals ?? [])
    .map((d) => `${d.description ?? ""} ${(d.dealDays ?? []).join(" ")}`)
    .join(" ");
  const tags = (v.tags ?? []).join(" ");
  return [
    v.name,
    v.area,
    v.address,
    v.category,
    cats,
    v.dealTitle,
    v.dealDescription,
    deals,
    tags,
  ]
    .filter(Boolean)
    .some((f) => (f as string).toLowerCase().includes(s));
}

const MapView = lazy(() => import("./MapView"));

function isAdminMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("admin") === "1") return true;
    return window.localStorage.getItem("eifo.admin") === "1";
  } catch {
    return false;
  }
}

export function EifoApp() {
  const { all, addPlace, importLocalToCloud, hasLocalToImport } = usePlaces();
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const { theme, toggle: toggleTheme } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [activeChips, setActiveChips] = useState<Set<ChipKey>>(
    () => new Set<ChipKey>(),
  );
  const [activeTags, setActiveTags] = useState<Set<string>>(
    () => new Set<string>(),
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editVenue, setEditVenue] = useState<Venue | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"map" | "list">("map");
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(true);
  }, []);

  const filtered = useMemo(
    () => {
      const now = new Date();
      return all.filter(
        (v) =>
          matchesChips(v, activeChips, now) &&
          matchesTags(v, activeTags) &&
          matchesQuery(v, query),
      );
    },
    [all, activeChips, activeTags, query],
  );

  // Search dropdown results: query-only across all venues (ignore chips)
  const searchResults = useMemo(
    () => (query.trim() ? all.filter((v) => matchesQuery(v, query)) : []),
    [all, query],
  );

  const selected = all.find((v) => v.id === selectedId) ?? null;

  // Map shows filtered venues, but always include the selected one so it stays visible
  const mapVenues = useMemo(() => {
    if (!selected) return filtered;
    if (filtered.some((v) => v.id === selected.id)) return filtered;
    return [...filtered, selected];
  }, [filtered, selected]);

  const totalActive = filtered.length;

  const recommendations = useMemo(() => {
    const now = new Date();
    const rankKind: Record<string, number> = {
      active: 0, allDay: 1, soon: 2, later: 3, ended: 4, notToday: 5, unknown: 6,
    };
    return [...filtered]
      .map((v) => {
        const p = pickPrimaryDeal(v, now);
        return {
          v,
          dealRank: rankKind[p?.status.kind ?? "unknown"] ?? 6,
          dist: v.distanceM ?? Number.POSITIVE_INFINITY,
          rating: v.rating ?? 0,
        };
      })
      .sort(
        (a, b) =>
          a.dealRank - b.dealRank ||
          a.dist - b.dist ||
          b.rating - a.rating,
      )
      .slice(0, 8)
      .map((s) => s.v);
  }, [filtered]);


  const toggleChip = (k: ChipKey) => {
    setActiveChips((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleTag = (t: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[var(--map-bg)]">
      {view === "map" ? (
        mapReady ? (
          <Suspense
            fallback={<div className="absolute inset-0 animate-pulse bg-[var(--map-bg)]" />}
          >
            <MapView
              venues={mapVenues}
              selectedId={selectedId ?? highlightedId}
              onSelect={(v: Venue) => {
                setSelectedId(v.id);
                setHighlightedId(v.id);
              }}
              theme={theme}
            />
          </Suspense>
        ) : (
          <div className="absolute inset-0 bg-[var(--map-bg)]" />
        )
      ) : (
        <VenueList
          venues={filtered}
          onSelect={(v) => {
            setSelectedId(v.id);
            setView("map");
          }}
        />
      )}

      <FloatingSearch
        onOpenFilters={() => setFiltersOpen(true)}
        activeChips={activeChips}
        onToggleChip={toggleChip}
        onAddPlace={() => setAddOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        query={query}
        onQueryChange={setQuery}
        results={searchResults}
        onSelectResult={(v) => {
          setSelectedId(v.id);
          setQuery("");
          setView("map");
        }}
        onOpenMore={() => setMoreOpen(true)}
        moreActiveCount={activeTags.size}
        view={view}
        onToggleView={() => setView((v) => (v === "map" ? "list" : "map"))}
      />

      {hasLocalToImport && isAdminMode() && (
        <div
          dir="rtl"
          className="pointer-events-none absolute inset-x-0 top-32 z-[450] flex justify-center px-4"
        >
          <button
            disabled={importing}
            onClick={async () => {
              setImporting(true);
              setImportMsg(null);
              try {
                const res = await importLocalToCloud();
                setImportMsg(
                  res.imported > 0
                    ? "המקומות הועברו בהצלחה"
                    : "אין מקומות חדשים לייבוא",
                );
              } catch {
                setImportMsg("הייבוא נכשל");
              } finally {
                setImporting(false);
                setTimeout(() => setImportMsg(null), 3000);
              }
            }}
            className="pointer-events-auto rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-[var(--brand-navy)] shadow-[var(--shadow-float)] ring-1 ring-black/10 backdrop-blur disabled:opacity-60"
          >
            {importing ? "מייבא..." : importMsg ?? "ייבא מקומות מקומיים"}
          </button>
        </div>
      )}

      {view === "map" && filtered.length === 0 && (query || activeChips.size > 0 || activeTags.size > 0) && (
        <div
          dir="rtl"
          className="pointer-events-none absolute inset-x-0 top-1/2 z-[400] flex justify-center px-6"
        >
          <div className="pointer-events-auto rounded-2xl bg-white/95 px-4 py-3 text-sm font-semibold text-[var(--brand-navy)] shadow-[var(--shadow-float)] ring-1 ring-black/5 backdrop-blur">
            לא נמצאו מקומות מתאימים
          </div>
        </div>
      )}

      {view === "map" && selected && (
        <VenueBottomCard
          venue={selected}
          onClose={() => setSelectedId(null)}
          totalActive={totalActive}
          onEdit={(v) => {
            setEditVenue(v);
            setAddOpen(true);
          }}
        />
      )}

      {view === "map" && !selected && (
        <VenueCarousel
          venues={recommendations}
          highlightedId={highlightedId}
          onHighlight={(id) => setHighlightedId(id)}
          onSelect={(v) => {
            setHighlightedId(v.id);
            setSelectedId(v.id);
          }}
        />
      )}


      <AddPlaceSheet
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setEditVenue(null);
        }}
        editVenue={editVenue}
        onSave={async (v) => {
          const saved = await addPlace(v);
          setSelectedId(saved?.id ?? v.id);
          setEditVenue(null);
        }}
      />

      <MoreFiltersSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        active={activeTags}
        onToggle={toggleTag}
        onClear={() => setActiveTags(new Set())}
      />

      {filtersOpen && (
        <div
          className="absolute inset-0 z-[1000] flex items-end bg-black/30"
          onClick={() => setFiltersOpen(false)}
        >
          <div
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-3xl bg-white p-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/10" />
            <h3 className="text-lg font-extrabold text-[var(--brand-navy)]">
              סינון
            </h3>
            <div className="mt-4 space-y-4">
              <FilterRow
                label="קטגוריה"
                options={["הכל", "אוכל", "דרינק", "קפה", "דייט"]}
              />
              <FilterRow
                label="סוג מבצע"
                options={["הכל", "האפי האוור", "עסקי", "1+1"]}
              />
              <FilterRow
                label="מרחק"
                options={["500 מ׳", "1 ק״מ", "2 ק״מ", "הכל"]}
              />
            </div>
            <button
              onClick={() => setFiltersOpen(false)}
              className="mt-6 w-full rounded-2xl bg-[image:var(--gradient-brand)] py-3 text-sm font-bold text-white"
            >
              הצג תוצאות
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, options }: { label: string; options: string[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o, i) => (
          <button
            key={o}
            className={
              "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 " +
              (i === 0
                ? "bg-[var(--brand-navy)] text-white ring-transparent"
                : "bg-white text-[var(--brand-navy)] ring-black/10")
            }
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
