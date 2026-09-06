import { useEffect, useState } from "react";

/** Tel Aviv city center — reference point when no user location is available. */
export const TLV_CENTER: [number, number] = [32.0772, 34.774];

/** Average walking speed used across the app (meters per minute). */
export const WALK_METERS_PER_MIN = 80;

export function haversineMeters(
  a: [number, number],
  b: [number, number],
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Resolve a venue distance in meters:
 * 1. API/stored value
 * 2. computed from user position
 * 3. computed from city center
 */
export function resolveDistanceM(
  venue: { lat?: number; lng?: number; distanceM?: number },
  from: [number, number] | null,
): number | null {
  if (venue.distanceM != null && isFinite(venue.distanceM)) return venue.distanceM;
  if (venue.lat == null || venue.lng == null) return null;
  const origin = from ?? TLV_CENTER;
  const d = haversineMeters(origin, [venue.lat, venue.lng]);
  return isFinite(d) ? d : null;
}

export function formatDistance(m?: number | null): string | null {
  if (m == null || !isFinite(m)) return null;
  if (m < 1000) return `${Math.round(m / 10) * 10} מ׳`;
  return `${(m / 1000).toFixed(1)} ק״מ`;
}

export function walkMinutesText(m?: number | null): string | null {
  if (m == null || !isFinite(m)) return null;
  return `${Math.max(1, Math.round(m / WALK_METERS_PER_MIN))} דק׳ הליכה`;
}

/** Walking label with distance, e.g. "6 דק׳ הליכה · 450 מ׳". */
export function walkLabel(m?: number | null): string | null {
  const walk = walkMinutesText(m);
  const dist = formatDistance(m);
  if (!walk) return null;
  return dist ? `${walk} · ${dist}` : walk;
}

/**
 * Passive user position: only reads geolocation when permission is already
 * granted, so it never triggers a prompt on its own.
 */
export function useUserPosition(): [number, number] | null {
  const [pos, setPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    const read = () =>
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (!cancelled) setPos([p.coords.latitude, p.coords.longitude]);
        },
        () => {},
        { timeout: 8000, maximumAge: 300000 },
      );

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((s) => {
          if (s.state === "granted") read();
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, []);

  return pos;
}
