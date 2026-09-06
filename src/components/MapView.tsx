import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useEffect, useState } from "react";
import L from "leaflet";
import { type Venue } from "@/data/mockVenues";
import { venueIcon, clusterIcon } from "./leaflet-setup";
import { pickPrimaryDeal } from "@/lib/venueDeals";
import { type Theme } from "@/lib/theme";


const TLV: [number, number] = [32.0772, 34.7740];

function PanToSelected({ venue }: { venue: Venue | null }) {
  const map = useMap();
  useEffect(() => {
    if (!venue) return;

    const run = () => {
      const size = map.getSize();
      const isMobile = size.x < 768;
      const currentZoom = map.getZoom();
      const targetZoom = currentZoom < 15 ? 15 : currentZoom;

      if (targetZoom !== currentZoom) {
        map.setZoom(targetZoom, { animate: false });
      }

      // Measure the header (search/filter) and bottom card to compute the
      // safe visible map area between them.
      const headerEl = document.querySelector<HTMLElement>("[data-top-header]");
      const cardEl = document.querySelector<HTMLElement>(
        "[data-venue-bottom-card]",
      );
      const headerH = headerEl?.offsetHeight ?? (isMobile ? 120 : 96);
      const cardH = cardEl?.offsetHeight ?? (isMobile ? 320 : 0);

      const topSafe = headerH + 24;
      const bottomSafe = (isMobile ? cardH : 0) + 24;
      const available = Math.max(120, size.y - topSafe - bottomSafe);
      const desiredY = topSafe + available * 0.5;

      const markerPoint = map.latLngToContainerPoint([venue.lat, venue.lng]);
      const centerPoint = map.latLngToContainerPoint(map.getCenter());
      const dx = markerPoint.x - size.x / 2;
      const dy = markerPoint.y - desiredY;
      const newCenterPoint = L.point(centerPoint.x + dx, centerPoint.y + dy);
      const targetLatLng = map.containerPointToLatLng(newCenterPoint);
      map.panTo(targetLatLng, { animate: true });
    };

    const t = window.setTimeout(() => requestAnimationFrame(run), 90);
    return () => window.clearTimeout(t);
  }, [venue, map]);
  return null;
}


function FlyToUser({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, 15, { duration: 0.6 });
  }, [pos, map]);
  return null;
}

const userIcon = () =>
  L.divIcon({
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,.25),0 4px 12px -2px rgba(0,0,0,.3);"></div>`,
    className: "eifo-user-pin",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

type Props = {
  venues: Venue[];
  selectedId: string | null;
  onSelect: (v: Venue) => void;
  theme?: Theme;
};

const TILE_LIGHT =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_DARK =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export function MapView({ venues, selectedId, onSelect, theme = "light" }: Props) {
  const selected = venues.find((v) => v.id === selectedId) ?? null;
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocMsg("המיקום לא זמין כרגע");
      setTimeout(() => setLocMsg(null), 3000);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setUserPos([p.coords.latitude, p.coords.longitude]);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocMsg(
          err.code === err.PERMISSION_DENIED
            ? "לא ניתן לזהות מיקום"
            : "המיקום לא זמין כרגע",
        );
        setTimeout(() => setLocMsg(null), 3000);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <>
      <MapContainer
        center={TLV}
        zoom={15}
        zoomControl={false}
        attributionControl={false}
        className="absolute inset-0 h-full w-full"
        style={{ background: theme === "dark" ? "#0a0f1c" : "#eef1f5" }}
      >
        <TileLayer key={theme} url={theme === "dark" ? TILE_DARK : TILE_LIGHT} />

        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom={false}
          zoomToBoundsOnClick={false}
          animate
          disableClusteringAtZoom={18}
          removeOutsideVisibleBounds
          iconCreateFunction={clusterIcon}
          maxClusterRadius={(zoom: number) => (zoom >= 16 ? 30 : zoom >= 14 ? 55 : 80)}
          eventHandlers={{
            clusterclick: (e: L.LeafletEvent) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const cluster = (e as any).layer;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const map: L.Map = cluster._map ?? (e.target as any)._map;
              const headerEl = document.querySelector<HTMLElement>("[data-top-header]");
              const cardEl = document.querySelector<HTMLElement>("[data-venue-bottom-card]");
              const topPad = (headerEl?.offsetHeight ?? 120) + 24;
              const bottomPad = (cardEl?.offsetHeight ?? 0) + 24;
              try {
                const bounds = cluster.getBounds();
                map.fitBounds(bounds, {
                  paddingTopLeft: L.point(24, topPad),
                  paddingBottomRight: L.point(24, bottomPad),
                  maxZoom: 18,
                  animate: true,
                });
              } catch {
                cluster.zoomToBounds?.({ padding: [40, 40] });
              }
            },
          }}
        >
          {venues.map((v) => {
            const p = pickPrimaryDeal(v, now);
            const urgent =
              p?.status.kind === "active" &&
              p.status.endsInMin > 0 &&
              p.status.endsInMin < 30;
            return (
              <Marker
                key={v.id}
                position={[v.lat, v.lng]}
                icon={venueIcon(v, v.id === selectedId, {
                  dark: theme === "dark",
                  urgent,
                })}
                eventHandlers={{ click: () => onSelect(v) }}
              />
            );
          })}


        </MarkerClusterGroup>


        {userPos && <Marker position={userPos} icon={userIcon()} />}

        <PanToSelected venue={selected} />
        <FlyToUser pos={userPos} />
      </MapContainer>

      <button
        onClick={requestLocation}
        disabled={locating}
        aria-label="המיקום שלי"
        style={{ bottom: "calc(var(--bottom-card-h, 132px) + 16px)" }}
        className="absolute left-4 z-[700] grid h-11 w-11 place-items-center rounded-full bg-white/95 text-[var(--brand-navy)] shadow-[var(--shadow-float)] ring-1 ring-black/10 backdrop-blur disabled:opacity-60"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      </button>

      {locMsg && (
        <div
          dir="rtl"
          style={{ bottom: "calc(var(--bottom-card-h, 132px) + 76px)" }}
          className="pointer-events-none absolute inset-x-0 z-[700] flex justify-center px-4"
        >
          <div className="rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-[var(--brand-navy)] shadow-[var(--shadow-float)] ring-1 ring-black/10 backdrop-blur">
            {locMsg}
          </div>
        </div>
      )}
    </>
  );
}

export default MapView;
