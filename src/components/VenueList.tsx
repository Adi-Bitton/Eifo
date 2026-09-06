import { Clock, MapPin, Navigation2, Star, CalendarCheck } from "lucide-react";
import { type Venue } from "@/data/mockVenues";
import { pickPrimaryDeal, getCategoryKeys } from "@/lib/venueDeals";
import { categoryLabel } from "@/data/mockVenues";
import { VenueImage, VenueImageFallback } from "@/components/VenueImage";


type Props = {
  venues: Venue[];
  onSelect: (v: Venue) => void;
  topInset?: number;
};

function openExternal(url: string) {
  if (!url || typeof document === "undefined") return;
  const u = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const a = document.createElement("a");
  a.href = u;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function VenueList({ venues, onSelect, topInset = 140 }: Props) {
  return (
    <div
      dir="rtl"
      className="absolute inset-0 z-[400] overflow-y-auto bg-[var(--surface)]"
      style={{ paddingTop: topInset, paddingBottom: 96 }}
    >
      <div className="mx-auto flex max-w-md flex-col gap-3 px-3 pb-6">
        {venues.length === 0 ? (
          <div className="mt-12 text-center text-sm font-semibold text-muted-foreground">
            לא נמצאו מקומות מתאימים
          </div>
        ) : (
          venues.map((v) => (
            <VenueListCard key={v.id} venue={v} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  );
}

function VenueListCard({
  venue,
  onSelect,
}: {
  venue: Venue;
  onSelect: (v: Venue) => void;
}) {
  const primary = pickPrimaryDeal(venue);
  const deal = primary?.deal;
  const tags = getCategoryKeys(venue)
    .slice(0, 3)
    .map((k) => categoryLabel(k));
  const hours = deal
    ? deal.allDay
      ? "כל היום"
      : deal.dealStart && deal.dealEnd
        ? `${deal.dealStart}–${deal.dealEnd}`
        : deal.dealStart || deal.dealEnd || ""
    : venue.dealWindow;

  return (
    <button
      type="button"
      onClick={() => onSelect(venue)}
      className="group flex w-full flex-col overflow-hidden rounded-2xl bg-white text-right shadow-[0_4px_14px_-6px_rgba(15,23,42,0.10)] ring-1 ring-black/[0.05] transition active:scale-[.99]"
    >
      <VenueImage
        sources={[venue.imageUrl]}
        alt={venue.name}
        className="aspect-[21/9] w-full object-cover"
        fallback={
          <VenueImageFallback
            categoryKey={venue.categoryKey}
            iconSize={26}
            className="aspect-[21/9] w-full"
          />
        }
      />



      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold text-[var(--brand-navy)]">
            {venue.name}
          </h3>
          {venue.rating != null && (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-semibold text-[var(--brand-navy)]">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {venue.rating.toFixed(1)}
            </span>
          )}
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-muted-foreground">
          {tags.length > 0 ? (
            <span className="inline-flex flex-wrap gap-1">
              {tags.map((t, i) => (
                <span
                  key={t + i}
                  className="rounded-full bg-black/[.05] px-1.5 py-px text-[11px] font-medium text-[var(--brand-navy)]/80"
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
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {venue.area || venue.address}
              </span>
            </>
          )}
        </div>

        <div className="mt-2 rounded-xl bg-[color-mix(in_oklab,var(--brand-pink)_8%,var(--surface))] px-3 py-2 ring-1 ring-[color-mix(in_oklab,var(--brand-pink)_18%,transparent)]">
          <p className="line-clamp-2 text-[13.5px] font-semibold leading-tight text-[var(--brand-navy)]">
            {deal?.description || venue.dealTitle}
          </p>
          {hours && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {hours}
            </p>
          )}
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          {Number.isFinite(venue.lat) && Number.isFinite(venue.lng) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openExternal(
                  `https://waze.com/ul?ll=${venue.lat},${venue.lng}&navigate=yes`,
                );
              }}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-[image:var(--gradient-brand)] py-2 text-[13px] font-semibold text-white active:scale-[.98]"
            >
              <Navigation2 className="h-3.5 w-3.5" />
              נווט
            </button>
          )}
          {venue.reservationUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openExternal(venue.reservationUrl!);
              }}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-black/5 py-2 text-[13px] font-semibold text-[var(--brand-navy)] active:scale-[.98]"
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              הזמן
            </button>
          )}
        </div>
      </div>
    </button>
  );
}
