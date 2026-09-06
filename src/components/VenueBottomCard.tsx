import {
  Clock,
  MapPin,
  Navigation2,
  Phone,
  CalendarCheck,
  Star,
  X,
  ExternalLink,
  Instagram,
  Pencil,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { type Venue, type VenueDealItem } from "@/data/mockVenues";
import { getDeals, pickPrimaryDeal, getCategoryKeys, formatDurationHebrew } from "@/lib/venueDeals";
import { categoryLabel } from "@/data/mockVenues";
import { VenueImage, VenueImageFallback } from "@/components/VenueImage";


type Props = {
  venue: Venue | null;
  onClose: () => void;
  totalActive: number;
  onEdit?: (v: Venue) => void;
  recommendations?: Venue[];
  onSelectRecommendation?: (v: Venue) => void;
};


// Map common Hebrew day tokens to JS getDay() indices (Sun=0..Sat=6).
const DAY_MAP: Record<string, number> = {
  "א": 0, "א׳": 0, "ראשון": 0,
  "ב": 1, "ב׳": 1, "שני": 1,
  "ג": 2, "ג׳": 2, "שלישי": 2,
  "ד": 3, "ד׳": 3, "רביעי": 3,
  "ה": 4, "ה׳": 4, "חמישי": 4,
  "ו": 5, "ו׳": 5, "שישי": 5,
  "ש": 6, "שבת": 6,
};

function parseDealDays(s?: string): Set<number> | null {
  if (!s) return null;
  const out = new Set<number>();
  // Tokens like "א׳-ה׳" or "א׳–ה׳" -> range
  const rangeRe = /([א-ת]׳?)\s*[-–]\s*([א-ת]׳?)/g;
  let m: RegExpExecArray | null;
  let rest = s;
  while ((m = rangeRe.exec(s))) {
    const a = DAY_MAP[m[1]];
    const b = DAY_MAP[m[2]];
    if (a != null && b != null) {
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      for (let i = lo; i <= hi; i++) out.add(i);
      rest = rest.replace(m[0], " ");
    }
  }
  for (const tok of rest.split(/[,\s]+/).filter(Boolean)) {
    const d = DAY_MAP[tok];
    if (d != null) out.add(d);
  }
  return out.size > 0 ? out : null;
}

function parseHM(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

type Urgency =
  | { kind: "active"; endsInMin?: number }
  | { kind: "soon"; startsInMin: number }
  | { kind: "later" }
  | { kind: "ended" }
  | { kind: "allDay" }
  | { kind: "notToday" }
  | { kind: "unknown" };

function computeUrgency(v: Venue, now = new Date()): Urgency {
  const days = parseDealDays(v.dealDays);
  const today = now.getDay();
  const isToday = days ? days.has(today) : true;
  const allDay = !v.dealStart && !v.dealEnd;
  if (allDay) {
    return isToday ? { kind: "allDay" } : { kind: "notToday" };
  }
  const s = parseHM(v.dealStart);
  const e = parseHM(v.dealEnd);
  if (s == null || e == null) return { kind: "unknown" };
  if (!isToday) return { kind: "notToday" };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin < s) {
    const startsIn = s - nowMin;
    return startsIn <= 60 ? { kind: "soon", startsInMin: startsIn } : { kind: "later" };
  }
  if (nowMin >= s && nowMin <= e) {
    return { kind: "active", endsInMin: e - nowMin };
  }
  return { kind: "ended" };
}

function formatCountdown(minutes: number, kind: "ends" | "starts"): string {
  const prefix = kind === "ends" ? "מסתיים בעוד" : "מתחיל בעוד";
  return `${prefix} ${formatDurationHebrew(minutes)}`;
}


function urgencyText(u: Urgency): string | null {
  switch (u.kind) {
    case "active":
      return u.endsInMin != null
        ? `פעיל עכשיו · ${formatCountdown(u.endsInMin, "ends")}`
        : "פעיל עכשיו";
    case "soon":
      return u.startsInMin != null
        ? formatCountdown(u.startsInMin, "starts")
        : "מתחיל בקרוב";
    case "later":
      return "מתחיל מאוחר יותר היום";
    case "ended":
      return "הסתיים להיום";
    case "allDay":
      return "כל היום";
    case "notToday":
      return "לא פעיל היום";
    default:
      return null;
  }
}

/** Short time-badge label + urgency level for the image overlay badge.
 * Single source of truth for time urgency:
 *   > 60 min left → green "פעיל עכשיו"
 *   ≤ 60 min left → orange/red countdown
 */
function timeBadge(u: Urgency, v?: Venue | null): { label: string; level: "active" | "endingSoon" | "endingNow" | "upcoming" | "neutral" | "off" } | null {
  switch (u.kind) {
    case "active": {
      const m = u.endsInMin;
      if (m != null && m <= 15) return { label: `נגמר בעוד ${formatDurationHebrew(m)}`, level: "endingNow" };
      if (m != null && m <= 60) return { label: `מסתיים בעוד ${formatDurationHebrew(m)}`, level: "endingSoon" };
      return { label: "פעיל עכשיו", level: "active" };
    }
    case "allDay":
      return { label: "פעיל עכשיו", level: "active" };
    case "soon": {
      const m = u.startsInMin;
      if (m != null) return { label: `מתחיל בעוד ${formatDurationHebrew(m)}`, level: "upcoming" };
      return { label: "מתחיל בקרוב", level: "upcoming" };
    }
    case "later": {
      const s = v?.dealStart;
      return { label: s ? `מתחיל ב־${s}` : "מתחיל מאוחר יותר", level: "upcoming" };
    }
    case "ended":
      return { label: "הסתיים להיום", level: "off" };
    case "notToday":
      return { label: "לא פעיל היום", level: "off" };
    default:
      return null;
  }
}



function timeBadgeClass(level: "active" | "endingSoon" | "endingNow" | "upcoming" | "neutral" | "off"): string {
  switch (level) {
    case "active":
      return "bg-emerald-500/95 text-white ring-emerald-300/50";
    case "endingSoon":
      return "bg-orange-500/95 text-white ring-orange-300/50";
    case "endingNow":
      return "bg-rose-500/95 text-white ring-rose-300/50 animate-[pulse_2.4s_ease-in-out_infinite]";
    case "upcoming":
      return "bg-white/90 text-[var(--brand-navy)] ring-black/10 backdrop-blur-md";
    case "off":
      return "bg-black/55 text-white ring-white/10 backdrop-blur-md";
    default:
      return "bg-white/90 text-[var(--brand-navy)] ring-black/10 backdrop-blur-md";
  }
}


export function VenueBottomCard({ venue, onClose, totalActive, onEdit, recommendations, onSelectRecommendation }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dealOpen, setDealOpen] = useState(false);
  const [extraDealsOpen, setExtraDealsOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setDealOpen(false);
    setExtraDealsOpen(false);
  }, [venue?.id, venue?.imageUrl]);


  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setNow(new Date());
    if (!venue?.id) return;
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, [venue?.id]);

  useEffect(() => {
    if (!ref.current) return;
    const h = ref.current.offsetHeight;
    document.documentElement.style.setProperty("--bottom-card-h", `${h}px`);
  }, [venue]);

  // Resolve currently-relevant deal (active > all-day > soon > later > ended > notToday)
  const allDeals = venue ? getDeals(venue) : [];
  const primary = venue ? pickPrimaryDeal(venue, now) : null;
  const primaryDeal: VenueDealItem | null = primary?.deal ?? null;
  const extraDeals: VenueDealItem[] = primary
    ? allDeals.filter((_, i) => i !== primary.index)
    : [];
  // Synthesize a venue-like view for the deal hours/days/urgency rendering.
  const dealView = primaryDeal
    ? {
        dealTitle: primaryDeal.description || venue?.dealTitle || "דיל מיוחד",
        dealDescription: primaryDeal.description || venue?.dealDescription,
        dealDays: (primaryDeal.dealDays ?? []).join(", "),
        dealStart: primaryDeal.allDay ? undefined : primaryDeal.dealStart,
        dealEnd: primaryDeal.allDay ? undefined : primaryDeal.dealEnd,
        dealWindow:
          primaryDeal.allDay
            ? "כל היום"
            : primaryDeal.dealStart && primaryDeal.dealEnd
              ? `${primaryDeal.dealStart}–${primaryDeal.dealEnd}`
              : "",
      }
    : null;
  const urgency: Urgency | null = primary
    ? (primary.status as unknown as Urgency)
    : venue
      ? computeUrgency(venue, now)
      : null;
  const urgencyLabel = urgency ? urgencyText(urgency) : null;
  const reviewsUrl =
    venue?.googleUrl ||
    (venue
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${venue.name} ${venue.area || venue.address || ""}`.trim(),
        )}`
      : "");
  const categoryTags = venue
    ? getCategoryKeys(venue).slice(0, 3).map((k) => categoryLabel(k))
    : [];

  return (
    <div
      ref={ref}
      data-venue-bottom-card
      dir="rtl"
      className="absolute inset-x-0 bottom-0 z-[600] px-3 pb-[max(env(safe-area-inset-bottom),12px)]"
    >
      <div className="mx-auto max-w-md overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-float)] ring-1 ring-black/5">
        {venue ? (
          <div>
            {/* Drag handle */}
            <div className="absolute inset-x-0 top-1.5 z-[10] flex justify-center">
              <div className="h-1 w-10 rounded-full bg-black/15" />
            </div>
            {/* Cover image / fallback — wide banner */}
            <div className="relative">
              <VenueImage
                sources={[venue.imageUrl]}
                alt={venue.name}
                loading="eager"
                className="aspect-[21/9] w-full object-cover"
                fallback={
                  <VenueImageFallback
                    categoryKey={venue.categoryKey}
                    iconSize={26}
                    className="aspect-[21/9] w-full"
                  />
                }

              />

              <button
                onClick={onClose}
                aria-label="סגור"
                className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
              {(() => {
                const tb = urgency ? timeBadge(urgency, venue) : null;
                if (!tb) return null;
                return (
                  <span
                    className={
                      "absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 shadow-sm " +
                      timeBadgeClass(tb.level)
                    }
                  >
                    {(tb.level === "active" || tb.level === "endingSoon" || tb.level === "endingNow") && (
                      <span className={"h-1.5 w-1.5 rounded-full " + (tb.level === "active" ? "bg-white" : "bg-white")} />
                    )}
                    {tb.label}
                  </span>
                );
              })()}

            </div>

            <div className="px-5 pb-4 pt-3.5">
              {/* Place name */}
              <h2 className="truncate text-[17px] font-bold leading-tight text-[var(--brand-navy)]">
                {venue.name}
              </h2>
              {/* Single inline meta + rating row */}
              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-muted-foreground">
                {categoryTags.length > 0 ? (
                  <span className="inline-flex flex-wrap items-center gap-1">
                    {categoryTags.map((t, i) => (
                      <span
                        key={t + i}
                        className="rounded-full bg-black/[.05] px-1.5 py-px text-[11px] font-medium text-[var(--brand-navy)]/85"
                      >
                        {t}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span>{venue.category}</span>
                )}
                {(venue.area || venue.address) && (
                  <>
                    <span className="opacity-40">•</span>
                    <span>{venue.area || venue.address}</span>
                  </>
                )}
                {venue.priceRange && (
                  <>
                    <span className="opacity-40">•</span>
                    <span>{venue.priceRange}</span>
                  </>
                )}
                {venue.verified && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="inline-flex items-center gap-0.5 text-[11.5px] font-medium text-emerald-700">
                      <svg viewBox="0 0 20 20" className="h-3 w-3 fill-emerald-500" aria-hidden>
                        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.7 6.3-4.5 4.5a1 1 0 01-1.4 0l-2-2a1 1 0 111.4-1.4L8.5 10.7l3.8-3.8a1 1 0 011.4 1.4z" />
                      </svg>
                      מאומת
                    </span>
                  </>
                )}

                {venue.rating != null && (
                  <>
                    <span className="opacity-40">•</span>
                    {venue.googleUrl ? (
                      <button
                        type="button"
                        onClick={() => openExternal(venue.googleUrl!)}
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-[var(--brand-navy)]">
                          {venue.rating.toFixed(1)}
                        </span>
                        {venue.reviewsCount != null && (
                          <span>({venue.reviewsCount.toLocaleString()} ביקורות)</span>
                        )}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-[var(--brand-navy)]">
                          {venue.rating.toFixed(1)}
                        </span>
                        {venue.reviewsCount != null && (
                          <span>({venue.reviewsCount.toLocaleString()} ביקורות)</span>
                        )}
                      </span>
                    )}
                  </>
                )}
              </div>


              {/* Deal block — uses the currently relevant deal */}
              <div className="mt-3 rounded-2xl bg-[color-mix(in_oklab,var(--brand-pink)_8%,var(--surface))] px-4 py-3 text-right ring-1 ring-[color-mix(in_oklab,var(--brand-pink)_18%,transparent)]">
                <p className="text-right text-[15px] font-bold leading-[1.35] text-[var(--brand-navy)]">
                  {dealView?.dealTitle || venue.dealTitle}
                </p>


                <DealDescription
                  text={dealView?.dealDescription ?? venue.dealDescription}
                  title={dealView?.dealTitle ?? venue.dealTitle}
                  open={dealOpen}
                  onToggle={() => setDealOpen((v) => !v)}
                />
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
                  {(dealView?.dealDays || venue.dealDays) && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarCheck className="h-3.5 w-3.5" />
                      {dealView?.dealDays || venue.dealDays}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDealHours(dealView ?? venue, urgency)}
                  </span>
                </div>
              </div>


              {/* Additional deals (collapsed) */}
              {extraDeals.length > 0 && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setExtraDealsOpen((v) => !v)}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--brand-pink)] hover:underline"
                  >
                    {extraDealsOpen ? "פחות" : `עוד דילים (${extraDeals.length})`}
                  </button>
                  {extraDealsOpen && (
                    <ul className="mt-1.5 space-y-1.5">
                      {extraDeals.map((d, i) => {
                        const days = (d.dealDays ?? []).join(", ");
                        const hours = d.allDay
                          ? "כל היום"
                          : d.dealStart && d.dealEnd
                            ? `${d.dealStart}–${d.dealEnd}`
                            : d.dealStart || d.dealEnd || "";
                        return (
                          <li
                            key={i}
                            className="rounded-xl bg-black/[.03] px-3 py-2 text-[12px] leading-tight text-[var(--brand-navy)]/85"
                          >
                            <div className="font-semibold">{d.description || "דיל"}</div>
                            <div className="mt-0.5 text-muted-foreground">
                              {[days, hours].filter(Boolean).join(" • ")}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {/* Actions — one primary CTA (reservation if available, otherwise navigate) */}
              {(() => {
                const hasCoords = Number.isFinite(venue.lat) && Number.isFinite(venue.lng);
                const reservePrimary = !!venue.reservationUrl;
                return (
                  <div className="mt-3.5 flex items-stretch gap-2">
                    {reservePrimary && (
                      <ActionButton
                        href={venue.reservationUrl!}
                        icon={<CalendarCheck className="h-4 w-4" />}
                        label="הזמן"
                        primary
                      />
                    )}
                    {hasCoords && (
                      <NavigateButton lat={venue.lat} lng={venue.lng} primary={!reservePrimary} compact={reservePrimary} />
                    )}
                    {venue.instagramUrl && (
                      <IconButton
                        href={venue.instagramUrl}
                        icon={<Instagram className="h-4 w-4" />}
                        label="אינסטגרם"
                      />
                    )}
                    {venue.phone && (
                      <IconButton
                        href={`tel:${venue.phone}`}
                        icon={<Phone className="h-4 w-4" />}
                        label="התקשר"
                      />
                    )}
                  </div>
                );
              })()}


              {/* Disclaimer */}
              <p className="mt-2.5 text-center text-[10.5px] leading-tight text-muted-foreground">
                המידע עשוי להשתנות — מומלץ לוודא מול המקום
              </p>

              {/* Secondary link (edit) */}
              {onEdit && (
                <div className="mt-1.5 flex items-center gap-x-4 gap-y-1">
                  <button
                    type="button"
                    onClick={() => onEdit(venue)}
                    className="ms-auto inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-[var(--brand-navy)]"
                  >
                    <Pencil className="h-3 w-3" />
                    ערוך
                  </button>
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="p-3 pt-3.5">
            <div className="absolute inset-x-0 top-1.5 z-[10] flex justify-center">
              <div className="h-1 w-10 rounded-full bg-black/15" />
            </div>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <p className="text-[14px] font-extrabold text-[var(--brand-navy)]">
                שווה לבדוק עכשיו
              </p>
              <p className="text-[11px] text-muted-foreground">
                {mounted ? `${totalActive} באזור` : "—"}
              </p>
            </div>
            {recommendations && recommendations.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {recommendations.slice(0, 3).map((v) => (
                  <RecommendationRow
                    key={v.id}
                    venue={v}
                    onSelect={() => onSelectRecommendation?.(v)}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-1 pb-1 text-[12px] text-muted-foreground">
                אין מקומות שתואמים את הסינון כרגע
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function RatingLine({
  rating,
  reviewsCount,
  href,
}: {
  rating: number;
  reviewsCount?: number;
  href?: string;
}) {
  const content = (
    <>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="font-semibold text-[var(--brand-navy)]">
        {rating.toFixed(1)}
      </span>
      {reviewsCount != null && (
        <span className="text-muted-foreground">
          • {reviewsCount.toLocaleString()} ביקורות
        </span>
      )}
    </>
  );
  if (href) {
    return (
      <button
        type="button"
        onClick={() => openExternal(href)}
        className="mt-1 inline-flex items-center gap-1 text-[12px] hover:underline"
      >
        {content}
      </button>
    );
  }
  return (
    <div className="mt-1 inline-flex items-center gap-1 text-[12px]">
      {content}
    </div>
  );
}

function formatDealHours(
  v: { dealStart?: string; dealEnd?: string; dealWindow: string },
  urgency: Urgency | null,
): string {
  if (urgency?.kind === "allDay") return "כל היום";
  if (v.dealStart && v.dealEnd) return `${v.dealStart}–${v.dealEnd}`;
  if (v.dealEnd) return `עד ${v.dealEnd}`;
  if (v.dealStart) return `מ-${v.dealStart}`;
  return v.dealWindow;
}

// Highlights discount-like tokens (e.g. "50%", "1+1", "₪29") with larger, bolder weight.
function highlightDeal(text: string): React.ReactNode[] {
  const re = /(\d+\s*%|\d+\s*\+\s*\d+|₪\s*\d+(?:\.\d+)?|\$\s*\d+(?:\.\d+)?)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <span
        key={`h${i++}`}
        className="text-[1.18em] font-extrabold tracking-tight text-[var(--brand-pink)]"
      >
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}


function DealDescription({
  text,
  title,
  open,
  onToggle,
}: {
  text?: string;
  title?: string;
  open: boolean;
  onToggle: () => void;
}) {
  if (!text || text === title) return null;
  const clean = text.trim();
  // Split on newlines first, then on common bullet/separator characters used
  // by users when typing all deals into a single line (•, *, -, ;, /, |, ·).
  const rawItems = clean
    .split(/\r?\n+/)
    .flatMap((line) =>
      line
        .split(/\s*(?:[•*·]|(?<=[^\d])[/|;](?=[^\d]))\s*/g)
        .map((s) => s.replace(/^[-–—\s]+/, "").trim())
        .filter(Boolean),
    );
  const items = rawItems.length > 0 ? rawItems : [clean];
  const isMulti = items.length > 1;
  const isLong = !isMulti && (clean.length > 100);
  const visibleItems = isMulti && !open ? items.slice(0, 2) : items;
  const hasMore = isMulti && items.length > 2;

  return (
    <div className="mt-1.5 text-right">
      {isMulti ? (
        <ul className="space-y-1 text-[15px] font-normal leading-[1.4] text-[var(--brand-navy)]/80">
          {visibleItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-[0.55em] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-pink)]/60"
              />
              <span className="min-w-0 flex-1">{highlightDeal(item)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p
          className={
            "whitespace-pre-line text-[15px] font-normal leading-[1.4] text-[var(--brand-navy)]/80 " +
            (isLong && !open ? "line-clamp-2" : "")
          }
        >
          {highlightDeal(clean)}
        </p>
      )}
      {(hasMore || isLong) && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-1 text-[11px] font-semibold text-[var(--brand-pink)] hover:underline"
        >
          {open ? "פחות" : "עוד"}
        </button>
      )}
    </div>
  );
}

function normalizeUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("tel:") || url.startsWith("mailto:")) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function openExternal(url: string) {
  if (!url || typeof document === "undefined") return;
  const u = normalizeUrl(url);
  if (u.startsWith("tel:") || u.startsWith("mailto:")) {
    window.location.href = u;
    return;
  }
  const a = document.createElement("a");
  a.href = u;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function isInIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function ActionButton({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  const isTel = href.startsWith("tel:");
  return (
    <button
      type="button"
      onClick={() => openExternal(href)}
      className={
        "inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-[14px] font-semibold active:scale-[.98] " +
        (primary
          ? "bg-[image:var(--gradient-brand)] text-white shadow-sm"
          : "bg-black/5 text-[var(--brand-navy)]")
      }
      aria-label={label}
      data-tel={isTel ? "1" : undefined}
    >
      {icon}
      {label}
    </button>
  );
}

function NavigateButton({
  lat,
  lng,
  primary = true,
  compact = false,
}: {
  lat?: number;
  lng?: number;
  primary?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const hasCoords =
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const openNav = (provider: "google" | "waze" | "apple") => {
    if (!hasCoords) {
      setError("אין מיקום זמין לניווט");
      return;
    }
    const url =
      provider === "google"
        ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        : provider === "waze"
          ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
          : `https://maps.apple.com/?daddr=${lat},${lng}`;
    openExternal(url);
    setOpen(false);
  };

  const showGoogleNote = isInIframe();

  const btnClass = primary
    ? "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[image:var(--gradient-brand)] text-[14px] font-semibold text-white shadow-sm active:scale-[.98]"
    : compact
      ? "inline-flex h-11 w-11 items-center justify-center rounded-xl bg-black/5 text-[var(--brand-navy)] active:scale-[.95]"
      : "inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-black/5 text-[14px] font-semibold text-[var(--brand-navy)] active:scale-[.98]";

  return (
    <div ref={ref} className={compact ? "relative" : "relative flex-1"}>
      <button
        type="button"
        onClick={() => {
          if (!hasCoords) {
            setError("אין מיקום זמין לניווט");
            return;
          }
          setError(null);
          setOpen((v) => !v);
        }}
        className={btnClass}
        aria-label="נווט"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Navigation2 className="h-4 w-4" />
        {!compact && "נווט"}
      </button>

      {open && hasCoords && (
        <div
          role="menu"
          dir="rtl"
          className="absolute bottom-full right-0 z-[700] mb-2 w-52 overflow-hidden rounded-xl bg-white shadow-[var(--shadow-float)] ring-1 ring-black/10"
        >
          <button
            role="menuitem"
            type="button"
            onClick={() => openNav("waze")}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-right text-sm font-semibold text-[var(--brand-navy)] hover:bg-black/5"
          >
            <span>🚗</span>
            Waze
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => openNav("google")}
            className="flex w-full items-center gap-2 border-t border-black/5 px-3 py-2.5 text-right text-sm font-semibold text-[var(--brand-navy)] hover:bg-black/5"
          >
            <span>🗺️</span>
            Google Maps
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => openNav("apple")}
            className="flex w-full items-center gap-2 border-t border-black/5 px-3 py-2.5 text-right text-sm font-semibold text-[var(--brand-navy)] hover:bg-black/5"
          >
            <span>🍎</span>
            Apple Maps
          </button>
          {showGoogleNote && (
            <p
              dir="rtl"
              className="border-t border-black/5 bg-amber-50 px-3 py-2 text-[10px] font-medium text-amber-800"
            >
              ייתכן ש-Google חסום בתצוגה מקדימה. נסה אחרי Publish.
            </p>
          )}
        </div>
      )}
      {error && (
        <p
          dir="rtl"
          className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function IconButton({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => openExternal(href)}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/5 text-[var(--brand-navy)] active:scale-[.95]"
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

function RecommendationRow({
  venue,
  onSelect,
}: {
  venue: Venue;
  onSelect: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  const primary = pickPrimaryDeal(venue, now);
  const urgency = (primary?.status as unknown as Urgency) ?? { kind: "unknown" as const };
  const tb = timeBadge(urgency, venue);
  const dealText = primary?.deal.description || venue.dealTitle || "";
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-3 rounded-2xl bg-black/[.03] p-2 text-right transition active:scale-[.99]"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
          <VenueImage
            sources={[venue.imageUrl]}
            alt={venue.name}
            className="h-full w-full object-cover"
            fallback={
              <VenueImageFallback
                categoryKey={venue.categoryKey}
                iconSize={18}
                className="h-full w-full"
              />
            }

          />

        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[13.5px] font-bold text-[var(--brand-navy)]">
              {venue.name}
            </p>
            {tb && (
              <span
                className={
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 " +
                  timeBadgeClass(tb.level)
                }
              >
                {tb.label}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[12px] leading-tight text-[var(--brand-navy)]/80">
            {highlightDeal(dealText)}
          </p>
        </div>
      </button>
    </li>
  );
}

