import { useCallback, useEffect, useState } from "react";
import { mockVenues, type Venue, categoryEmoji, categoryLabel, type CategoryKey } from "@/data/mockVenues";
import { supabase } from "@/integrations/supabase/client";

const KEY = "eifo.places.v1";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(id: string | undefined): boolean {
  return !!id && UUID_RE.test(id);
}

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback: RFC4122 v4
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * One-time cleanup: drop legacy placeholder drafts saved in this browser so the
 * app starts from an empty slate. Real places added from now on are kept.
 */
const RESET_KEY = "eifo.places.reset.v1";
function purgeLegacyLocal() {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(RESET_KEY) === "1") return;
    window.localStorage.removeItem(KEY);
    window.localStorage.setItem(RESET_KEY, "1");
  } catch {
    /* ignore */
  }
}

function loadLocal(): Venue[] {
  if (typeof window === "undefined") return [];
  purgeLegacyLocal();
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Venue[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(list: Venue[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

type VenueRow = {
  id: string;
  name: string;
  category: string | null;
  categories: string[] | null;
  area: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  rating: number | null;
  review_count: number | null;
  phone_number: string | null;
  navigation_url: string | null;
  reservation_url: string | null;
  instagram_url: string | null;
  google_reviews_url: string | null;
  website_url: string | null;
  deal_days: string[] | null;
  deal_start_time: string | null;
  deal_end_time: string | null;
  is_all_day: boolean | null;
  deal_description: string | null;
  deals: unknown;
  price_range: string | null;
  notes: string | null;
  verified_status: string | null;
  is_published: boolean | null;
};

function rowToVenue(r: VenueRow): Venue {
  const catKey = (r.category ?? "other") as CategoryKey;
  const categoryKeys =
    Array.isArray(r.categories) && r.categories.length > 0
      ? r.categories
      : r.category
        ? [r.category]
        : [];
  const daysArr = r.deal_days ?? [];
  const dealDays = daysArr.length ? daysArr.join(", ") : undefined;
  const dealWindow = r.is_all_day
    ? "כל היום"
    : r.deal_start_time && r.deal_end_time
      ? `${r.deal_start_time}–${r.deal_end_time}`
      : "";
  const deals = Array.isArray(r.deals)
    ? (r.deals as Venue["deals"])
    : undefined;
  return {
    id: r.id,
    name: r.name,
    category: categoryLabel(catKey),
    categoryKey: catKey,
    categoryKeys,
    emoji: categoryEmoji(catKey),
    lat: r.latitude ?? 32.0853,
    lng: r.longitude ?? 34.7818,
    area: r.area ?? undefined,
    address: r.address ?? undefined,
    imageUrl: r.image_url ?? undefined,
    rating: r.rating ?? undefined,
    reviewsCount: r.review_count ?? undefined,
    phone: r.phone_number ?? undefined,
    navUrl: r.navigation_url ?? undefined,
    reservationUrl: r.reservation_url ?? undefined,
    googleUrl: r.google_reviews_url ?? undefined,
    instagramUrl: r.instagram_url ?? undefined,
    websiteUrl: r.website_url ?? undefined,
    dealTitle: r.deal_description ?? "",
    dealDescription: r.deal_description ?? undefined,
    dealWindow,
    dealDays,
    dealStart: r.deal_start_time ?? undefined,
    dealEnd: r.deal_end_time ?? undefined,
    deals: deals && deals.length > 0 ? deals : undefined,
    priceRange: r.price_range ?? undefined,
    notes: r.notes ?? undefined,
    verified: r.verified_status === "verified",
    active: true,
    custom: true,
  };
}

function venueToRow(v: Venue): Omit<VenueRow, "is_published"> & { is_published: boolean } {
  const days = v.dealDays
    ? v.dealDays
        .split(/[,،/]| /)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const isAllDay = !v.dealStart && !v.dealEnd;
  const cats =
    v.categoryKeys && v.categoryKeys.length > 0
      ? v.categoryKeys
      : v.categoryKey
        ? [v.categoryKey]
        : [];
  return {
    id: isUuid(v.id) ? v.id : newUuid(),
    name: v.name,
    category: (cats[0] ?? v.categoryKey ?? null) as string | null,
    categories: cats,
    area: v.area ?? null,
    address: v.address ?? null,
    latitude: v.lat ?? null,
    longitude: v.lng ?? null,
    image_url: v.imageUrl ?? null,
    rating: v.rating ?? null,
    review_count: v.reviewsCount ?? null,
    phone_number: v.phone ?? null,
    navigation_url: v.navUrl ?? null,
    reservation_url: v.reservationUrl ?? null,
    instagram_url: v.instagramUrl ?? null,
    google_reviews_url: v.googleUrl ?? null,
    website_url: v.websiteUrl ?? null,
    deal_days: days,
    deal_start_time: v.dealStart ?? null,
    deal_end_time: v.dealEnd ?? null,
    is_all_day: isAllDay,
    deal_description: v.dealDescription ?? v.dealTitle ?? null,
    deals: v.deals ?? [],
    price_range: v.priceRange ?? null,
    notes: v.notes ?? null,
    verified_status: v.verified ? "verified" : null,
    is_published: true,
  };
}

export function usePlaces() {
  const [cloud, setCloud] = useState<Venue[]>([]);
  const [local, setLocal] = useState<Venue[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchCloud = useCallback(async () => {
    const { data, error } = await supabase
      .from("venues" as never)
      .select("*")
      .eq("is_published", true);
    if (error) {
      console.warn("[places] cloud fetch failed:", error.message);
      return;
    }
    setCloud(((data ?? []) as unknown as VenueRow[]).map(rowToVenue));
  }, []);

  useEffect(() => {
    setLocal(loadLocal());
    fetchCloud().finally(() => setLoaded(true));
  }, [fetchCloud]);

  const upsertPlace = useCallback(
    async (v: Venue) => {
      const row = venueToRow(v);
      // Optimistic local mirror
      const merged: Venue = { ...v, id: row.id };
      setCloud((prev) => {
        const idx = prev.findIndex((p) => p.id === row.id);
        if (idx >= 0) return prev.map((p, i) => (i === idx ? merged : p));
        return [...prev, merged];
      });
      const { error } = await supabase
        .from("venues" as never)
        .upsert(row as never, { onConflict: "id" });
      if (error) {
        console.error("[places] upsert failed:", error.message);
        // Fallback: persist locally so user data isn't lost
        setLocal((prev) => {
          const idx = prev.findIndex((p) => p.id === v.id);
          const next =
            idx >= 0
              ? prev.map((p, i) => (i === idx ? v : p))
              : [...prev, v];
          saveLocal(next);
          return next;
        });
        return v;
      }
      await fetchCloud();
      return merged;
    },
    [fetchCloud],
  );

  const removePlace = useCallback(
    async (id: string) => {
      setCloud((prev) => prev.filter((p) => p.id !== id));
      setLocal((prev) => {
        const next = prev.filter((p) => p.id !== id);
        saveLocal(next);
        return next;
      });
      if (isUuid(id)) {
        await supabase.from("venues" as never).delete().eq("id", id);
      }
    },
    [],
  );

  const importLocalToCloud = useCallback(async () => {
    const localVenues = loadLocal();
    if (localVenues.length === 0) {
      return { imported: 0, skipped: 0 };
    }
    // Avoid duplicates by name+address combo against existing cloud venues
    const existingKeys = new Set(
      cloud.map((c) => `${c.name?.toLowerCase()}|${(c.address ?? "").toLowerCase()}`),
    );
    let imported = 0;
    let skipped = 0;
    for (const v of localVenues) {
      const key = `${v.name?.toLowerCase()}|${(v.address ?? "").toLowerCase()}`;
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }
      const row = venueToRow(v);
      const { error } = await supabase
        .from("venues" as never)
        .upsert(row as never, { onConflict: "id" });
      if (!error) imported++;
      else skipped++;
    }
    await fetchCloud();
    return { imported, skipped };
  }, [cloud, fetchCloud]);

  // Merge: cloud (source of truth) + local fallback + mock venues that aren't replaced
  const cloudIds = new Set(cloud.map((c) => c.id));
  const cloudNames = new Set(cloud.map((c) => c.name.toLowerCase()));
  const localFiltered = local.filter(
    (l) => !cloudIds.has(l.id) && !cloudNames.has(l.name.toLowerCase()),
  );
  const mockFiltered = mockVenues.filter(
    (m) => !cloudIds.has(m.id) && !cloudNames.has(m.name.toLowerCase()),
  );
  const all: Venue[] = [...cloud, ...localFiltered, ...mockFiltered];

  return {
    all,
    custom: cloud,
    addPlace: upsertPlace,
    upsertPlace,
    removePlace,
    importLocalToCloud,
    hasLocalToImport: local.length > 0,
    loaded,
  };
}
