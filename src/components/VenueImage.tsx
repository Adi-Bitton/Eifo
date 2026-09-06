import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Utensils,
  Martini,
  Coffee,
  Heart,
  Users,
  Waves,
  PiggyBank,
  MapPin,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  food: Utensils,
  drink: Martini,
  coffee: Coffee,
  cheap: PiggyBank,
  date: Heart,
  friends: Users,
  beach: Waves,
  other: MapPin,
};

function categoryIcon(key?: string): LucideIcon {
  return (key && CATEGORY_ICONS[key]) || MapPin;
}

/** Returns a usable https(:) URL or null for null/undefined/empty/invalid input. */
export function normalizeImageUrl(raw?: string | null): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s || s === "null" || s === "undefined") return null;
  if (s.startsWith("data:image/")) return s;
  const candidate = /^https?:\/\//i.test(s) ? s : /^\/\//.test(s) ? `https:${s}` : `https://${s}`;
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

type Props = {
  /** Candidate sources, tried in order. Invalid entries are skipped. */
  sources: (string | null | undefined)[];
  alt?: string;
  className?: string;
  /** Rendered when no source can load. */
  fallback: ReactNode;
  loading?: "lazy" | "eager";
};

/**
 * Image with safe fallbacks: never shows a broken-image icon, never loops
 * on failed reloads, and swallows load errors.
 */
export function VenueImage({ sources, alt = "", className, fallback, loading = "lazy" }: Props) {
  const urls = useMemo(() => {
    const out: string[] = [];
    for (const s of sources) {
      const n = normalizeImageUrl(s);
      if (n && !out.includes(n)) out.push(n);
    }
    return out;
  }, [sources]);

  const key = urls.join("|");
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const failed = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIndex(0);
    setLoaded(false);
  }, [key]);

  const src = urls[index];
  if (!src) return <>{fallback}</>;

  return (
    <div className={"relative overflow-hidden " + (className ?? "")}>
      {!loaded && (
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse bg-[color-mix(in_oklab,var(--brand-navy,#111)_7%,var(--surface,#fff))]"
        />
      )}
      <img
        key={src}
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        className={
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-300 " +
          (loaded ? "opacity-100" : "opacity-0")
        }
        onError={(e) => {
          // Stop the browser from retrying / showing the broken icon.
          e.currentTarget.onerror = null;
          failed.current.add(src);
          setLoaded(false);
          setIndex((i) => i + 1);
        }}
      />
    </div>
  );
}

/** Icon-based, quiet fallback used when no venue image is available. */
export function VenueImageFallback({
  categoryKey,
  className,
  iconSize = 22,
}: {
  categoryKey?: string;
  className?: string;
  iconSize?: number;
}) {
  const Icon = categoryIcon(categoryKey);
  return (
    <div
      className={
        "grid place-items-center bg-[color-mix(in_oklab,var(--brand-navy,#111)_5%,var(--surface,#fff))] " +
        (className ?? "")
      }
    >
      <Icon
        size={iconSize}
        strokeWidth={1.6}
        className="text-[color-mix(in_oklab,var(--brand-navy,#111)_35%,transparent)]"
      />
    </div>
  );
}
