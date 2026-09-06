import { useEffect, useMemo, useRef, useState } from "react";
import { type Venue, type CategoryKey, categoryLabel } from "@/data/mockVenues";
import { pickPrimaryDeal, type DealStatus, formatDurationHebrew } from "@/lib/venueDeals";
import { VenueImage, VenueImageFallback } from "@/components/VenueImage";
import { Star, MapPin } from "lucide-react";
import { resolveDistanceM, walkLabel, useUserPosition } from "@/lib/distance";
import { AppFooter } from "./AppFooter";




type BadgeLevel = "active" | "endingSoon" | "endingNow" | "upcoming" | "off";
type Badge = { label: string; level: BadgeLevel; pulse?: boolean };

function timeBadge(status: DealStatus, deal: { dealStart?: string }): Badge | null {
  switch (status.kind) {
    case "active": {
      const m = status.endsInMin;
      if (m <= 0) return null;
      if (m <= 15)
        return {
          label: `מסתיים בעוד ${formatDurationHebrew(m)}`,
          level: "endingNow",
          pulse: true,
        };
      if (m <= 30) return { label: `מסתיים בעוד ${formatDurationHebrew(m)}`, level: "endingSoon" };
      return { label: `מסתיים בעוד ${formatDurationHebrew(m)}`, level: "active" };
    }
    case "allDay":
      return { label: "פעיל עכשיו", level: "active" };
    case "soon":
      return {
        label:
          status.startsInMin <= 60 && deal.dealStart
            ? `מתחיל בעוד ${formatDurationHebrew(status.startsInMin)}`
            : deal.dealStart
              ? `מתחיל ב־${deal.dealStart}`
              : `מתחיל בעוד ${formatDurationHebrew(status.startsInMin)}`,
        level: "upcoming",
      };
    case "later":
      return {
        label: deal.dealStart ? `מתחיל ב־${deal.dealStart}` : "מאוחר יותר",
        level: "upcoming",
      };
    default:
      return null;
  }
}


function dotClass(level: BadgeLevel, pulse?: boolean): string {
  const base =
    level === "active"
      ? "bg-emerald-500"
      : level === "endingSoon"
        ? "bg-orange-500"
        : level === "endingNow"
          ? "bg-rose-500"
          : level === "upcoming"
            ? "bg-sky-500"
            : "bg-black/30 dark:bg-white/30";
  return pulse ? `${base} animate-pulse` : base;
}

function textLevelClass(level: BadgeLevel): string {
  switch (level) {
    case "active":
      return "text-emerald-700 dark:text-emerald-400";
    case "endingSoon":
      return "text-orange-700 dark:text-orange-400";
    case "endingNow":
      return "text-rose-700 dark:text-rose-400";
    case "upcoming":
      return "text-sky-700 dark:text-sky-400";
    default:
      return "text-black/60 dark:text-white/60";
  }
}


type Props = {
  venues: Venue[];
  highlightedId: string | null;
  onHighlight: (id: string) => void;
  onSelect: (v: Venue) => void;
};

const ROTATE_MS = 5500;
const FADE_MS = 260;

type Item = {
  v: Venue;
  deal: { description: string; dealStart?: string };
  badge: Badge;
  sponsored?: boolean;
};

export function VenueCarousel({ venues, highlightedId, onHighlight, onSelect }: Props) {
  const [mounted, setMounted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const userPos = useUserPosition();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const items: Item[] = useMemo(() => {
    return venues
      .map((v) => {
        const p = pickPrimaryDeal(v, now);
        if (!p) return null;
        const badge = timeBadge(p.status, p.deal);
        if (!badge) return null;
        return { v, deal: p.deal, badge } as Item;
      })
      .filter((x): x is Item => x !== null);
  }, [venues, now]);

  useEffect(() => {
    if (idx >= items.length) setIdx(0);
  }, [items.length, idx]);

  useEffect(() => {
    if (!highlightedId) return;
    const i = items.findIndex((x) => x.v.id === highlightedId);
    if (i < 0 || i === idx) return;
    setFadeIn(false);
    const t = window.setTimeout(() => {
      setIdx(i);
      setFadeIn(true);
    }, FADE_MS);
    return () => window.clearTimeout(t);
  }, [highlightedId, items, idx]);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      setFadeIn(false);
      window.setTimeout(() => {
        setIdx((i) => (i + 1) % items.length);
        setFadeIn(true);
      }, FADE_MS);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [items.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const setH = () =>
      document.documentElement.style.setProperty("--bottom-card-h", `${el.offsetHeight}px`);
    setH();
    const ro = new ResizeObserver(setH);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty("--bottom-card-h", "0px");
    };
  }, [mounted, items.length]);

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div
        ref={containerRef}
        data-venue-bottom-card
        dir="rtl"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[600] flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),12px)]"
      >
        <div className="pointer-events-none flex w-full max-w-[430px] flex-col items-center gap-1">
          <div className="pointer-events-auto w-full max-w-[430px] rounded-2xl bg-white/95 px-4 py-3 text-center text-xs font-semibold text-[var(--brand-navy)] shadow-md ring-1 ring-black/5 backdrop-blur dark:bg-zinc-900/95 dark:text-white dark:ring-white/10">
            לחץ על מקום במפה לראות מה שווה
          </div>
          <AppFooter />
        </div>
      </div>
    );
  }

  const current = items[Math.min(idx, items.length - 1)];
  const { v, deal, badge, sponsored } = current;
  const walk = walkLabel(resolveDistanceM(v, userPos)) ?? "מרחק לא זמין";
  const categoryTags = v.categoryKeys?.length
    ? v.categoryKeys.map((k) => categoryLabel(k as CategoryKey))
    : v.category
      ? [v.category]
      : [];



  const handleTap = () => {
    pausedRef.current = true;
    onHighlight(v.id);
    onSelect(v);
  };

  const navUrl =
    v.lat != null && v.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          `${v.name} ${v.area ?? ""}`.trim(),
        )}`;

  return (
    <div
      ref={containerRef}
      data-venue-bottom-card
      dir="rtl"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[600] flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),12px)]"
    >
      <div className="pointer-events-none flex w-full max-w-[430px] flex-col items-center gap-1">
        <div
          role="button"
        tabIndex={0}
        onClick={handleTap}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleTap();
        }}
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
        onTouchStart={() => { pausedRef.current = true; }}
        onTouchEnd={() => { window.setTimeout(() => (pausedRef.current = false), 2500); }}
        dir="rtl"
        className="pointer-events-auto flex w-full max-w-[430px] max-h-[240px] cursor-pointer flex-col overflow-hidden rounded-[24px] bg-white text-right ring-1 ring-black/[0.06] transition active:scale-[.99] dark:bg-[#1A1C23] dark:ring-white/10"
        style={{
          boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
          opacity: fadeIn ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
        aria-label={`${v.name} — ${deal.description}`}
      >
        {/* Image header */}
        <div className="relative h-[100px] w-full shrink-0 overflow-hidden">
          <VenueImage
            sources={[v.imageUrl]}
            alt=""
            className="h-[100px] w-full"
            fallback={
              <div className="h-[100px] w-full bg-gradient-to-br from-[#FFF0F5] to-[#FFF5EE] grid place-items-center dark:from-zinc-800 dark:to-zinc-800">
                <VenueImageFallback
                  categoryKey={v.categoryKey}
                  iconSize={28}
                  className="!h-12 !w-12 !rounded-full !bg-white/70 shadow-sm dark:!bg-zinc-700 dark:text-zinc-400"
                />
              </div>
            }
          />

          {/* Timer badge */}
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold shadow-sm ring-1 ring-black/5 backdrop-blur dark:bg-zinc-800 dark:ring-white/10">
            <span className={"h-1.5 w-1.5 rounded-full " + dotClass(badge.level, badge.pulse)} />
            <span className={textLevelClass(badge.level)}>{badge.label}</span>
          </div>

          {sponsored && (
            <span className="absolute left-2 top-2 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-black/50 ring-1 ring-black/5 dark:bg-zinc-800 dark:text-white/60 dark:ring-white/10">
              ממומן
            </span>
          )}
        </div>

        {/* Venue info */}
        <div className="flex flex-col px-3.5 pb-1.5 pt-2">
          {/* Header row: name right, rating left */}
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[16px] font-bold leading-tight text-[var(--brand-navy,#111)] dark:text-white">
              {v.name}
            </p>
            {v.rating != null && (
              <span className="flex shrink-0 items-center gap-0.5 text-[12px] font-semibold text-black/70 dark:text-white/80">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                {v.rating.toFixed(1)}
              </span>
            )}
          </div>

          {/* Tags row */}
          {categoryTags.length > 0 && (
            <p className="mt-0.5 truncate text-[13px] leading-tight text-black/50 dark:text-gray-400">
              {categoryTags.slice(0, 3).join(" • ")}
            </p>
          )}


          {/* Walking time row */}
          {walk && (
            <div className="mt-0.5 flex items-center gap-1 text-[12px] text-black/55 dark:text-gray-400">
              <MapPin size={12} className="shrink-0" />
              <span>{walk}</span>
            </div>
          )}
        </div>

        {/* Deal + action */}
        <div className="mx-2.5 mb-2.5 flex items-center justify-between gap-3 rounded-2xl bg-[#FDEDF3] px-3 py-2.5 dark:bg-zinc-800">
          <div className="min-w-0">
            <p
              className="min-w-0 text-[15px] font-extrabold leading-snug text-[#111] dark:text-white"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {deal.description}
            </p>
          </div>
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              pausedRef.current = true;
            }}
            className="shrink-0 rounded-full bg-gradient-to-l from-[#FF7A45] to-[#FF3D77] px-4 py-1.5 text-[12.5px] font-bold text-white shadow-sm active:scale-95"
          >
            נווט
          </a>
        </div>
      </div>
      <AppFooter />
    </div>
  </div>
  );
}
