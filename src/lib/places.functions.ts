import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

async function callGateway(path: string, init: RequestInit = {}) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
    throw new Error("Google Maps connector is not configured");
  }
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Places error ${res.status}: ${body.slice(0, 300)}`);
  }
  return res;
}

function parseCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  const patterns: RegExp[] = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /[?&]q=(?:loc:)?(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }
  return null;
}

async function expandUrl(raw: string): Promise<string> {
  try {
    const r = await fetch(raw, { redirect: "follow" });
    return r.url || raw;
  } catch {
    return raw;
  }
}

function deriveQueryFromUrl(url: string): string {
  const m = url.match(/\/maps\/place\/([^/@?#]+)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]).replace(/\+/g, " ");
    } catch {
      return m[1].replace(/\+/g, " ");
    }
  }
  const q = url.match(/[?&]q=([^&]+)/);
  if (q) {
    try {
      return decodeURIComponent(q[1]).replace(/\+/g, " ");
    } catch {
      return q[1];
    }
  }
  return url;
}

type Suggestion = {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
};

export const searchPlaces = createServerFn({ method: "POST" })
  .inputValidator(z.object({ query: z.string().min(1).max(500) }))
  .handler(async ({ data }): Promise<Suggestion[]> => {
    let q = data.query.trim();
    let locationBias:
      | { circle: { center: { latitude: number; longitude: number }; radius: number } }
      | undefined;

    if (/^https?:\/\//i.test(q)) {
      const expanded = await expandUrl(q);
      const coords = parseCoordsFromUrl(expanded);
      if (coords) {
        locationBias = {
          circle: {
            center: { latitude: coords.lat, longitude: coords.lng },
            radius: 50,
          },
        };
      }
      q = deriveQueryFromUrl(expanded);
    }

    const body: Record<string, unknown> = {
      textQuery: q,
      languageCode: "he",
      maxResultCount: 5,
    };
    if (locationBias) body.locationBias = locationBias;

    const res = await callGateway("/places/v1/places:searchText", {
      method: "POST",
      headers: {
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      places?: Array<{
        id: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude: number; longitude: number };
      }>;
    };
    return (json.places || []).map((p) => ({
      id: p.id,
      name: p.displayName?.text || "",
      address: p.formattedAddress || "",
      lat: p.location?.latitude,
      lng: p.location?.longitude,
    }));
  });

export type PlaceDetails = {
  id: string;
  name: string;
  address: string;
  area?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  googleUrl?: string;
  reviewsUrl?: string;
  website?: string;
  rating?: number;
  reviewsCount?: number;
  photoUrl?: string;
  /** Auto-detected Ontopo/Tabit reservation URL found anywhere in the Google response. */
  reservationUrl?: string;
  /** Every URL we saw in the Google response — for debugging. */
  allLinks?: string[];
};


async function fetchPhotoUrl(photoName: string): Promise<string | undefined> {
  try {
    const res = await callGateway(
      `/places/v1/${photoName}/media?maxHeightPx=800&skipHttpRedirect=true`,
      { method: "GET" },
    );
    const json = (await res.json()) as { photoUri?: string };
    return json.photoUri || undefined;
  } catch {
    return undefined;
  }
}

const RESERVATION_HOST_RE = /(?:^|[./@])(?:ontopo|tabit)(?:\.[a-z.]+)/i;

function collectUrls(value: unknown, sink: Set<string>): void {
  if (value == null) return;
  if (typeof value === "string") {
    // Strings can contain a URL inline; pull them out.
    const matches = value.match(/https?:\/\/[^\s"'<>)\]]+/gi);
    if (matches) for (const m of matches) sink.add(m);
    else if (/^https?:\/\//i.test(value)) sink.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, sink);
    return;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>))
      collectUrls(v, sink);
  }
}

const RESERVATION_BARE_RE =
  /(?:ontopo\.com|ontopo\.co\.il|tabit\.cloud|tabit\.co\.il|tabit\.com)\/[^\s"'<>)\]\\]+/i;
const RESERVATION_URL_RE =
  /https?:\/\/[^\s"'<>)\]\\]*(?:ontopo|tabit)[^\s"'<>)\]\\]*/i;

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "he,en;q=0.8",
      },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return (await res.text()).slice(0, 1_500_000);
  } catch {
    return null;
  }
}

function extractReservationFromHtml(html: string): string | null {
  const m = html.match(RESERVATION_URL_RE);
  if (m) return m[0];
  const bare = html.match(RESERVATION_BARE_RE);
  return bare ? `https://${bare[0]}` : null;
}

async function findReservationOnWebsite(url: string): Promise<string | null> {
  const html = await fetchHtml(url);
  if (!html) return null;
  return extractReservationFromHtml(html);
}

export const getPlaceDetails = createServerFn({ method: "POST" })
  .inputValidator(z.object({ placeId: z.string().min(1) }))
  .handler(async ({ data }): Promise<PlaceDetails> => {
    // Ask Google for everything that could carry a URL — website, maps links,
    // editorial summary, etc. The Places API (New) doesn't expose a dedicated
    // "reservation" field, so we scan every URL-bearing field for Ontopo/Tabit.
    const fields = [
      "id",
      "displayName",
      "formattedAddress",
      "addressComponents",
      "location",
      "nationalPhoneNumber",
      "internationalPhoneNumber",
      "googleMapsUri",
      "googleMapsLinks",
      "websiteUri",
      "rating",
      "userRatingCount",
      "photos",
      "editorialSummary",
      "reservable",
    ].join(",");
    const res = await callGateway(`/places/v1/places/${encodeURIComponent(data.placeId)}`, {
      method: "GET",
      headers: { "X-Goog-FieldMask": fields, "Accept-Language": "he" },
    });
    const raw = (await res.json()) as Record<string, unknown>;
    const p = raw as {
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>;
      location?: { latitude: number; longitude: number };
      nationalPhoneNumber?: string;
      internationalPhoneNumber?: string;
      googleMapsUri?: string;
      googleMapsLinks?: Record<string, string | undefined>;
      websiteUri?: string;
      rating?: number;
      userRatingCount?: number;
      photos?: Array<{ name?: string }>;
    };
    let area: string | undefined;
    for (const c of p.addressComponents || []) {
      if (
        c.types?.includes("locality") ||
        c.types?.includes("administrative_area_level_2") ||
        c.types?.includes("sublocality")
      ) {
        area = c.longText || c.shortText;
        if (c.types.includes("locality")) break;
      }
    }
    const firstPhotoName = p.photos?.find((ph) => ph.name)?.name;
    const photoUrl = firstPhotoName ? await fetchPhotoUrl(firstPhotoName) : undefined;

    // Collect every URL anywhere in the response.
    const urlSet = new Set<string>();
    collectUrls(raw, urlSet);
    const allLinks = Array.from(urlSet);

    // Find a reservation URL: any Ontopo / Tabit link.
    let reservationUrl = allLinks.find((u) => RESERVATION_HOST_RE.test(u));

    // Fallback 1: scrape the venue's own website for an embedded Ontopo/Tabit link.
    if (!reservationUrl && p.websiteUri && !RESERVATION_HOST_RE.test(p.websiteUri)) {
      const found = await findReservationOnWebsite(p.websiteUri);
      if (found) {
        reservationUrl = found;
        urlSet.add(found);
      }
    }

    // Fallback 2: scrape the Google Maps place page — booking-partner links
    // (Ontopo / Tabit) appear in its embedded JSON even when the Places API
    // doesn't expose them as a field.
    if (!reservationUrl && p.googleMapsUri) {
      const found = await findReservationOnWebsite(p.googleMapsUri);
      if (found) {
        reservationUrl = found;
        urlSet.add(found);
      }
    }

    return {
      id: p.id,
      name: p.displayName?.text || "",
      address: p.formattedAddress || "",
      area,
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      phone: p.nationalPhoneNumber || p.internationalPhoneNumber || "",
      googleUrl: p.googleMapsUri || "",
      reviewsUrl: p.googleMapsLinks?.reviewsUri || "",
      website: p.websiteUri || "",
      rating: typeof p.rating === "number" ? p.rating : undefined,
      reviewsCount:
        typeof p.userRatingCount === "number" ? p.userRatingCount : undefined,
      photoUrl,
      reservationUrl,
      allLinks: Array.from(urlSet),
    };
  });


export const findInstagramFromWebsite = createServerFn({ method: "POST" })
  .inputValidator(z.object({ url: z.string().url().max(2000) }))
  .handler(async ({ data }): Promise<{ instagramUrl: string | null }> => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(data.url, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; EifoBot/1.0; +https://eifo.app)",
          Accept: "text/html,*/*;q=0.8",
        },
      });
      clearTimeout(t);
      if (!res.ok) return { instagramUrl: null };
      const html = (await res.text()).slice(0, 500_000);
      const re =
        /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]{1,30})\/?/i;
      const m = html.match(re);
      if (!m) return { instagramUrl: null };
      const handle = m[1].toLowerCase();
      // Skip generic / non-profile paths
      if (
        ["p", "reel", "reels", "explore", "stories", "tv", "accounts"].includes(
          handle,
        )
      ) {
        return { instagramUrl: null };
      }
      return { instagramUrl: `https://www.instagram.com/${handle}/` };
    } catch {
      return { instagramUrl: null };
    }
  });
