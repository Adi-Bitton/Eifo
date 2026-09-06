import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, AlertTriangle, ChevronDown, Check, Search, Loader2, Plus, Minus, Trash2 } from "lucide-react";
import {
  CATEGORIES,
  categoryEmoji,
  categoryLabel,
  type CategoryKey,
  type Venue,
  type VenueDealItem,
} from "@/data/mockVenues";
import { searchPlaces, getPlaceDetails, findInstagramFromWebsite } from "@/lib/places.functions";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (v: Venue) => void;
  editVenue?: Venue | null;
};

const DAY_OPTS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "שבת"];

type Suggestion = {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
};

type LookupStatus = "idle" | "searching" | "resolving" | "resolved" | "error";

export function AddPlaceSheet({ open, onClose, onSave, editVenue }: Props) {
  const isEdit = !!editVenue;
  const search = useServerFn(searchPlaces);
  const details = useServerFn(getPlaceDetails);
  const findIg = useServerFn(findInstagramFromWebsite);

  const EMPTY_DEAL: VenueDealItem = {
    description: "",
    dealDays: [],
    dealStart: "",
    dealEnd: "",
    allDay: false,
  };
  const EMPTY_FORM = {
    query: "",
    name: "",
    area: "",
    address: "",
    lat: "",
    lng: "",
    navUrl: "",
    googleUrl: "",
    imageUrl: "",
    phone: "",
    reservationUrl: "",
    priceRange: "₪₪",
    categoryKeys: ["food"] as string[],
    verified: false,
    rating: undefined as number | undefined,
    reviewsCount: undefined as number | undefined,
    instagramUrl: "",
    websiteUrl: "",
    deals: [{ ...EMPTY_DEAL }] as VenueDealItem[],
  };
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LookupStatus>("idle");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [allLinks, setAllLinks] = useState<string[]>([]);
  const debounceRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);
  const selectedNameRef = useRef<string>("");

  // Debounced search when query changes
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = form.query.trim();
    // Guard: if the query matches the just-selected place, do not search again.
    if (selectedNameRef.current && q === selectedNameRef.current) {
      return;
    }
    if (q.length < 3) {
      setSuggestions([]);
      if (status === "searching" || status === "error") setStatus("idle");
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      const myReq = ++reqIdRef.current;
      setStatus("searching");
      setStatusMsg("");
      try {
        const results = await search({ data: { query: q } });
        if (myReq !== reqIdRef.current) return;
        setSuggestions(results);
        if (results.length === 0) {
          setStatus("error");
          setStatusMsg("לא נמצאו תוצאות. נסה לכתוב שם מקום או להדביק קישור אחר.");
        } else {
          setStatus("idle");
        }
      } catch (e) {
        if (myReq !== reqIdRef.current) return;
        console.error(e);
        setStatus("error");
        setStatusMsg("לא הצלחנו לחפש כרגע. נסה שוב.");
      }
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.query, open]);

  // Pre-fill when opening in edit mode; reset when opening in add mode.
  useEffect(() => {
    if (!open) return;
    // Reset the just-selected guard whenever the sheet (re)opens.
    selectedNameRef.current = editVenue?.name || "";
    if (editVenue) {
      // Build deals: prefer venue.deals; else fall back to legacy single-deal fields.
      const existingDeals =
        editVenue.deals && editVenue.deals.length > 0
          ? editVenue.deals.map((d) => ({ ...d, dealDays: d.dealDays ?? [] }))
          : [
              {
                description:
                  editVenue.dealDescription || editVenue.dealTitle || "",
                dealDays: editVenue.dealDays
                  ? editVenue.dealDays.split(/[,\s]+/).filter(Boolean)
                  : [],
                dealStart: editVenue.dealStart || "",
                dealEnd: editVenue.dealEnd || "",
                allDay: !editVenue.dealStart && !editVenue.dealEnd,
              },
            ];
      const cats =
        editVenue.categoryKeys && editVenue.categoryKeys.length > 0
          ? editVenue.categoryKeys
          : editVenue.categoryKey
            ? [editVenue.categoryKey]
            : [];
      setForm({
        query: editVenue.name || "",
        name: editVenue.name || "",
        area: editVenue.area || "",
        address: editVenue.address || "",
        lat: editVenue.lat != null ? String(editVenue.lat) : "",
        lng: editVenue.lng != null ? String(editVenue.lng) : "",
        navUrl: editVenue.navUrl || "",
        googleUrl: editVenue.googleUrl || "",
        imageUrl: editVenue.imageUrl || "",
        phone: editVenue.phone || "",
        reservationUrl: editVenue.reservationUrl || "",
        priceRange: editVenue.priceRange || "₪₪",
        categoryKeys: cats,
        verified: !!editVenue.verified,
        rating: editVenue.rating,
        reviewsCount: editVenue.reviewsCount,
        instagramUrl: editVenue.instagramUrl || "",
        websiteUrl: editVenue.websiteUrl || "",
        deals: existingDeals,
      });
      setStatus("resolved");
      setStatusMsg("עריכת מקום קיים");
      setSuggestions([]);
      setError(null);
    } else {
      // Add mode — always start fresh.
      setForm(EMPTY_FORM);
      setStatus("idle");
      setStatusMsg("");
      setSuggestions([]);
      setError(null);
      setAllLinks([]);
      setAdvancedOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editVenue?.id]);

  if (!open) return null;

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const classifyUrl = (
    url?: string,
  ): "reservation" | "instagram" | "google" | "website" | "none" => {
    if (!url) return "none";
    const u = url.toLowerCase();
    if (/(?:^|\/\/|\.)ontopo\.|(?:^|\/\/|\.)tabit\./i.test(u))
      return "reservation";
    if (/(?:^|\/\/|\.)instagram\.com\//i.test(u)) return "instagram";
    if (/(?:^|\/\/|\.)(google\.[^/]+|goo\.gl|maps\.app\.goo\.gl)\//i.test(u))
      return "google";
    return "website";
  };


  const pickSuggestion = async (s: Suggestion) => {
    // Mark as selected BEFORE state updates so the search effect skips
    // when form.query changes to the selected place name.
    selectedNameRef.current = s.name;
    // Cancel any in-flight debounced search.
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    reqIdRef.current++;
    setSuggestions([]);
    setStatus("resolving");
    setStatusMsg("");
    setAllLinks([]);
    try {
      const p = await details({ data: { placeId: s.id } });
      const lat = p.lat ?? s.lat;
      const lng = p.lng ?? s.lng;
      // Update guard to the resolved name (server may return a slightly
      // different name from the suggestion).
      selectedNameRef.current = p.name || s.name;

      // Server already scanned every URL in the Google response and picked
      // the Ontopo/Tabit one. As a safety net, also classify the website
      // field in case the server response is older.
      const kind = classifyUrl(p.website);
      const reservationFromServer = p.reservationUrl || "";
      const reservationFromWebsite = kind === "reservation" ? p.website! : "";
      const detectedReservation = reservationFromServer || reservationFromWebsite;
      const instagramFromWebsite = kind === "instagram" ? p.website! : "";
      // Only treat the website as a generic website if it isn't already
      // classified as reservation/instagram/google.
      const websiteFromWebsite = kind === "website" ? p.website! : "";

      const links = p.allLinks ?? [];
      setAllLinks(links);
      // eslint-disable-next-line no-console
      console.log("[AddPlace] Google links", {
        all: links,
        website: p.website,
        reservation: detectedReservation,
        instagram: instagramFromWebsite,
        reviews: p.reviewsUrl || p.googleUrl,
      });

      // PLACE-only merge — never touch deal_days/start/end/all_day/
      // description/price_range/category/verified/notes.
      setForm((f) => ({
        ...f,
        query: p.name || s.name || f.query,
        name: p.name || s.name || f.name,
        address: p.address || s.address || f.address,
        area: f.area || p.area || "",
        lat: lat != null ? lat.toFixed(6) : f.lat,
        lng: lng != null ? lng.toFixed(6) : f.lng,
        // Keep user-entered phone if present.
        phone: f.phone || p.phone || "",
        // Google reviews / maps link — never used as reservation.
        googleUrl: p.reviewsUrl || p.googleUrl || f.googleUrl,
        navUrl:
          lat != null && lng != null
            ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
            : f.navUrl,
        // Keep user-entered reservation URL; only fill if empty.
        reservationUrl: f.reservationUrl || detectedReservation,
        websiteUrl: f.websiteUrl || websiteFromWebsite,
        instagramUrl: f.instagramUrl || instagramFromWebsite,
        // Keep user-entered image; only fill if empty.
        imageUrl: f.imageUrl || p.photoUrl || "",
        rating: p.rating ?? f.rating,
        reviewsCount: p.reviewsCount ?? f.reviewsCount,
      }));
      if (p.photoUrl) {
        // eslint-disable-next-line no-console
        console.log("[AddPlace] Google photo captured", p.photoUrl);
      }
      if (lat != null && lng != null) {
        setStatus("resolved");
        setStatusMsg("המקום זוהה בהצלחה");
        setError(null);
      } else {
        setStatus("error");
        setStatusMsg("המקום זוהה אך ללא קואורדינטות. פתח פרטים טכניים.");
        setAdvancedOpen(true);
      }
      // Best-effort Instagram detection from the place's website (only if
      // the website itself wasn't already an Instagram URL).
      if (p.website && kind !== "instagram") {
        try {
          const ig = await findIg({ data: { url: p.website } });
          if (ig.instagramUrl) {
            setForm((f) => ({
              ...f,
              instagramUrl: f.instagramUrl || ig.instagramUrl || "",
            }));
          }
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.error(e);
      setStatus("error");
      setStatusMsg("לא הצלחנו לזהות את המקום. נסה קישור אחר או חפש לפי שם.");
    }
  };


  // ---- Deals (multi-item) helpers ----
  const updateDeal = (idx: number, patch: Partial<VenueDealItem>) =>
    setForm((f) => ({
      ...f,
      deals: f.deals.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    }));

  const addDeal = () =>
    setForm((f) => ({ ...f, deals: [...f.deals, { ...EMPTY_DEAL }] }));

  const removeDeal = (idx: number) =>
    setForm((f) => ({
      ...f,
      deals: f.deals.length <= 1 ? f.deals : f.deals.filter((_, i) => i !== idx),
    }));

  const toggleDealDay = (idx: number, d: string) =>
    setForm((f) => ({
      ...f,
      deals: f.deals.map((deal, i) => {
        if (i !== idx) return deal;
        const cur = deal.dealDays ?? [];
        if (cur.includes(d)) {
          return { ...deal, dealDays: cur.filter((x) => x !== d) };
        }
        if (cur.length === 1) {
          const a = DAY_OPTS.indexOf(cur[0]);
          const b = DAY_OPTS.indexOf(d);
          if (a !== -1 && b !== -1 && a !== b) {
            const [s, e] = a < b ? [a, b] : [b, a];
            return { ...deal, dealDays: DAY_OPTS.slice(s, e + 1) };
          }
        }
        return { ...deal, dealDays: [...cur, d] };
      }),
    }));

  const setDealDays = (idx: number, days: string[]) =>
    updateDeal(idx, { dealDays: days });

  // ---- Categories (multi-select up to 3) ----
  const toggleCategory = (k: string) =>
    setForm((f) => {
      const cur = f.categoryKeys;
      if (cur.includes(k)) {
        return { ...f, categoryKeys: cur.filter((x) => x !== k) };
      }
      if (cur.length >= 3) {
        setError("אפשר לבחור עד 3 קטגוריות");
        window.setTimeout(() => setError(null), 2500);
        return f;
      }
      return { ...f, categoryKeys: [...cur, k] };
    });

  const handleSave = () => {
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError(
        "חסר מיקום למקום הזה. חפש שוב, הדבק קישור Google Maps תקין, או פתח 'פרטים טכניים'.",
      );
      setAdvancedOpen(true);
      return;
    }
    const placeName = form.name.trim() || form.query.trim() || "מקום חדש";
    const cleanedDeals: VenueDealItem[] = form.deals
      .filter((d) => d.description.trim() || (d.dealDays && d.dealDays.length))
      .map((d) => ({
        description: d.description.trim(),
        dealDays: d.dealDays ?? [],
        dealStart: d.allDay ? undefined : d.dealStart || undefined,
        dealEnd: d.allDay ? undefined : d.dealEnd || undefined,
        allDay: !!d.allDay,
      }));
    const finalDeals = cleanedDeals.length > 0 ? cleanedDeals : [{
      description: "",
      dealDays: [],
      allDay: true,
    }];
    const first = finalDeals[0];
    const dealDaysStr = (first.dealDays ?? []).join(", ");
    const dealWindow = first.allDay
      ? "כל היום"
      : first.dealStart && first.dealEnd
        ? `${first.dealStart}–${first.dealEnd}`
        : first.dealStart || first.dealEnd || "כל היום";

    const cats = form.categoryKeys.length > 0 ? form.categoryKeys : ["other"];
    const primaryCat = cats[0] as CategoryKey;

    const venue: Venue = {
      id: editVenue?.id || `custom-${Date.now()}`,
      name: placeName,
      category: categoryLabel(primaryCat),
      categoryKey: primaryCat,
      categoryKeys: cats,
      emoji: categoryEmoji(primaryCat),
      lat,
      lng,
      area: form.area || undefined,
      address: form.address || undefined,
      imageUrl: form.imageUrl || undefined,
      phone: form.phone || undefined,
      navUrl:
        form.navUrl ||
        `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      reservationUrl: form.reservationUrl || undefined,
      googleUrl: form.googleUrl || undefined,
      dealTitle: first.description || "דיל מיוחד",
      dealDescription: first.description || undefined,
      dealWindow,
      dealDays: dealDaysStr || undefined,
      dealStart: first.allDay ? undefined : first.dealStart || undefined,
      dealEnd: first.allDay ? undefined : first.dealEnd || undefined,
      deals: finalDeals,
      priceRange: form.priceRange || undefined,
      verified: form.verified,
      active: true,
      custom: true,
      rating: form.rating,
      reviewsCount: form.reviewsCount,
      instagramUrl: form.instagramUrl.trim() || undefined,
      websiteUrl: form.websiteUrl.trim() || undefined,
    };
    onSave(venue);
    setError(null);
    onClose();
  };

  const hasCoords = !!form.lat && !!form.lng;

  return (
    <div
      className="fixed inset-0 z-[1500] flex items-end bg-black/40"
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold text-[var(--brand-navy)]">
              {isEdit ? "עריכת מקום" : "הוספת מקום"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {isEdit
                ? "ערוך את פרטי המקום והדיל ושמור שינויים."
                : "הדבק לינק או חפש שם — נמלא את הפרטים בשבילך."}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="סגור"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/5 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* SECTION 1 — המקום */}
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            המקום
          </p>

          <Field label="הדבק לינק Google Maps או חפש שם מקום" required>
            <div className="relative">
              {status === "searching" || status === "resolving" ? (
                <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : (
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              )}
              <input
                value={form.query}
                onChange={(e) => {
                  const v = e.target.value;
                  // User edited the field — allow searches again.
                  if (v !== selectedNameRef.current) {
                    selectedNameRef.current = "";
                  }
                  set("query", v);
                  if (status === "resolved") setStatus("idle");
                }}
                placeholder="קפה לואיז, או https://maps.google.com/…"
                className="w-full rounded-2xl bg-black/[.04] py-3.5 pl-4 pr-10 text-sm outline-none focus:bg-black/[.07]"
              />
            </div>

            {/* Suggestions list */}
            {suggestions.length > 0 && (
              <ul className="mt-2 overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-float)] ring-1 ring-black/5">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => pickSuggestion(s)}
                      className="block w-full px-4 py-2.5 text-right text-sm hover:bg-black/[.04]"
                    >
                      <div className="font-semibold text-[var(--brand-navy)]">
                        {s.name}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {s.address}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Status messages */}
            {status === "searching" && (
              <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">
                מחפש מקומות…
              </p>
            )}
            {status === "resolving" && (
              <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">
                מזהה את המקום…
              </p>
            )}
            {status === "resolved" && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <Check className="h-3.5 w-3.5" />
                {statusMsg}
              </p>
            )}
            {status === "error" && statusMsg && (
              <p className="mt-1.5 flex items-start gap-1 text-[11px] font-semibold text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 translate-y-px" />
                {statusMsg}
              </p>
            )}
          </Field>

          {/* Resolved place card */}
          {status === "resolved" && form.name && (
            <div className="mt-3 flex gap-3 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
              {form.imageUrl ? (
                <img
                  src={form.imageUrl}
                  alt={form.name}
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-black/5"
                />
              ) : (
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white text-2xl ring-1 ring-black/5">
                  📍
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-[var(--brand-navy)]">
                  {form.name}
                </div>
                {form.address && (
                  <div className="truncate text-[11px] text-muted-foreground">
                    {form.address}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                  {form.rating != null && (
                    <span className="font-semibold text-[var(--brand-navy)]">
                      ⭐ {form.rating.toFixed(1)}
                      {form.reviewsCount != null && (
                        <span className="ms-1 font-normal text-muted-foreground">
                          · {form.reviewsCount.toLocaleString()} ביקורות
                        </span>
                      )}
                    </span>
                  )}
                  {form.imageUrl && <span>· תמונה מ-Google</span>}
                </div>
              </div>
            </div>
          )}

          {/* DEBUG — Google auto-fill visibility (temporary) */}
          {status === "resolved" && (
            <details className="mt-3 overflow-hidden rounded-2xl bg-amber-50 ring-1 ring-amber-200">
              <summary className="cursor-pointer list-none px-4 py-2.5 text-[11px] font-bold text-amber-900">
                🐞 נתוני Google שזוהו (דיבאג)
              </summary>
              <div className="space-y-1 px-4 pb-3 pt-1 text-[11px] text-amber-950">
                <DebugRow k="שם המקום" v={form.name} />
                <DebugRow k="כתובת" v={form.address} />
                <DebugRow k="טלפון" v={form.phone} />
                <DebugRow k="אתר כללי" v={form.websiteUrl} link />
                <DebugRow k="קישור Google Maps" v={form.navUrl} link />
                <DebugRow k="ביקורות בגוגל" v={form.googleUrl} link />
                {form.reservationUrl ? (
                  <div className="rounded-lg bg-emerald-100 px-2 py-1 font-bold text-emerald-900" dir="ltr">
                    קישור הזמנה שזוהה: <a href={form.reservationUrl} target="_blank" rel="noopener noreferrer" className="underline break-all">{form.reservationUrl}</a>
                  </div>
                ) : (
                  <div className="rounded-lg bg-amber-100 px-2 py-1 font-bold text-amber-900">
                    לא זוהה קישור הזמנה
                  </div>
                )}

                <DebugRow k="קישור אינסטגרם" v={form.instagramUrl} link />
                <DebugRow k="Latitude" v={form.lat} />
                <DebugRow k="Longitude" v={form.lng} />
                <DebugRow
                  k="Rating"
                  v={form.rating != null ? String(form.rating) : ""}
                />
                <DebugRow
                  k="Review count"
                  v={
                    form.reviewsCount != null ? String(form.reviewsCount) : ""
                  }
                />
                <DebugRow k="Image URL" v={form.imageUrl} link />
                <div className="pt-2">
                  <div className="font-bold">
                    כל הקישורים שזוהו ({allLinks.length})
                  </div>
                  {allLinks.length === 0 ? (
                    <div className="text-amber-800/70">— אין —</div>
                  ) : (
                    <ul className="mt-1 space-y-0.5">
                      {allLinks.map((u) => {
                        const isRes = /(?:^|[./@])(?:ontopo|tabit)(?:\.[a-z.]+)/i.test(u);
                        return (
                          <li key={u} className="break-all" dir="ltr">
                            {isRes && <span className="me-1">✅</span>}
                            <a
                              href={u}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={
                                isRes
                                  ? "font-bold text-emerald-700 underline"
                                  : "text-amber-900 underline"
                              }
                            >
                              {u}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </details>
          )}


          {/* Advanced fields — collapsed by default */}
          <div className="mt-3 overflow-hidden rounded-2xl bg-black/[.03] ring-1 ring-black/5">
            <button
              type="button"
              onClick={() => setAdvancedOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-[var(--brand-navy)]"
            >
              <span>
                פרטים טכניים
                {hasCoords ? (
                  <span className="ms-1 text-[11px] font-semibold text-emerald-600">
                    · מוגדר
                  </span>
                ) : (
                  <span className="ms-1 text-[11px] font-medium text-muted-foreground">
                    · לא חובה
                  </span>
                )}
              </span>
              <ChevronDown
                className={
                  "h-4 w-4 transition " + (advancedOpen ? "rotate-180" : "")
                }
              />
            </button>
            {advancedOpen && (
              <div className="space-y-3 px-4 pb-4">
                <Field label="שם המקום">
                  <BigInput value={form.name} onChange={(v) => set("name", v)} />
                </Field>
                <Row>
                  <Field label="אזור">
                    <BigInput value={form.area} onChange={(v) => set("area", v)} />
                  </Field>
                  <Field label="כתובת">
                    <BigInput
                      value={form.address}
                      onChange={(v) => set("address", v)}
                    />
                  </Field>
                </Row>
                <Row>
                  <Field label="Latitude">
                    <BigInput
                      value={form.lat}
                      onChange={(v) => set("lat", v)}
                      placeholder="32.0772"
                      inputMode="decimal"
                      dir="ltr"
                    />
                  </Field>
                  <Field label="Longitude">
                    <BigInput
                      value={form.lng}
                      onChange={(v) => set("lng", v)}
                      placeholder="34.7740"
                      inputMode="decimal"
                      dir="ltr"
                    />
                  </Field>
                </Row>
                <Field label="קישור ניווט">
                  <BigInput
                    value={form.navUrl}
                    onChange={(v) => set("navUrl", v)}
                    dir="ltr"
                  />
                </Field>
                <Field label="קישור ביקורות בגוגל">
                  <BigInput
                    value={form.googleUrl}
                    onChange={(v) => set("googleUrl", v)}
                    dir="ltr"
                  />
                </Field>
              </div>
            )}
          </div>

          {/* SECTION 2 — דילים (multi) */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                דילים
              </p>
              <span className="text-[11px] text-muted-foreground">
                {form.deals.length} פריט{form.deals.length === 1 ? "" : "ים"}
              </span>
            </div>

            <div className="space-y-4">
              {form.deals.map((deal, idx) => (
                <div
                  key={idx}
                  className="space-y-3 rounded-2xl bg-black/[.03] p-3 ring-1 ring-black/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--brand-navy)]">
                      פריט דיל #{idx + 1}
                    </span>
                    {form.deals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDeal(idx)}
                        aria-label="מחק פריט דיל"
                        className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-rose-500 ring-1 ring-rose-200 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        מחק
                      </button>
                    )}
                  </div>

                  <Field label="מה הדיל כולל">
                    <DealItemsInput
                      value={deal.description}
                      onChange={(v) => updateDeal(idx, { description: v })}
                    />
                  </Field>

                  <Field label="ימי הדיל">
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {[
                        { label: "א׳-ה׳", days: DAY_OPTS.slice(0, 5) },
                        { label: "א׳-ו׳", days: DAY_OPTS.slice(0, 6) },
                        { label: "כל השבוע", days: DAY_OPTS.slice() },
                      ].map((q) => (
                        <button
                          key={q.label}
                          type="button"
                          onClick={() => setDealDays(idx, q.days)}
                          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-black/10 transition hover:text-[var(--brand-navy)]"
                        >
                          {q.label}
                        </button>
                      ))}
                      {(deal.dealDays?.length ?? 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => setDealDays(idx, [])}
                          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-500 ring-1 ring-rose-200"
                        >
                          נקה
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DAY_OPTS.map((d) => {
                        const on = (deal.dealDays ?? []).includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleDealDay(idx, d)}
                            className={
                              "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition " +
                              (on
                                ? "bg-[var(--brand-navy)] text-white ring-transparent"
                                : "bg-white text-[var(--brand-navy)] ring-black/10")
                            }
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <div className="flex items-center justify-between gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-black/5">
                    <span className="text-xs font-semibold text-[var(--brand-navy)]">
                      כל היום
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!deal.allDay}
                      onClick={() => updateDeal(idx, { allDay: !deal.allDay })}
                      className={
                        "relative h-6 w-11 rounded-full transition " +
                        (deal.allDay ? "bg-[var(--brand-navy)]" : "bg-black/15")
                      }
                    >
                      <span
                        className={
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition " +
                          (deal.allDay ? "right-0.5" : "right-[22px]")
                        }
                      />
                    </button>
                  </div>

                  {!deal.allDay && (
                    <Row>
                      <Field label="שעת התחלה">
                        <TimeSelect
                          value={deal.dealStart || ""}
                          onChange={(v) => updateDeal(idx, { dealStart: v })}
                        />
                      </Field>
                      <Field label="שעת סיום">
                        <TimeSelect
                          value={deal.dealEnd || ""}
                          onChange={(v) => updateDeal(idx, { dealEnd: v })}
                        />
                      </Field>
                    </Row>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addDeal}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[var(--brand-pink)]/40 bg-[color-mix(in_oklab,var(--brand-pink)_6%,white)] px-4 py-2.5 text-[12px] font-semibold text-[var(--brand-pink)] hover:bg-[color-mix(in_oklab,var(--brand-pink)_10%,white)]"
              >
                <Plus className="h-4 w-4" />
                הוסף פריט דיל
              </button>

              <Field label="טווח מחיר">
                <div className="flex gap-1.5">
                  {["₪", "₪₪", "₪₪₪"].map((p) => {
                    const on = form.priceRange === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => set("priceRange", p)}
                        className={
                          "flex-1 rounded-xl py-2.5 text-sm font-bold ring-1 transition " +
                          (on
                            ? "bg-[var(--brand-navy)] text-white ring-transparent"
                            : "bg-white text-[var(--brand-navy)] ring-black/10")
                        }
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="קטגוריות (עד 3)">
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => {
                    const on = form.categoryKeys.includes(c.key);
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => toggleCategory(c.key)}
                        className={
                          "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition " +
                          (on
                            ? "bg-[image:var(--gradient-brand)] text-white ring-transparent"
                            : "bg-white text-[var(--brand-navy)] ring-black/10")
                        }
                      >
                        <span className="me-1">{c.emoji}</span>
                        {c.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  נבחרו {form.categoryKeys.length}/3
                </p>
              </Field>


              <Field label="קישור להזמנת מקום">
                <BigInput
                  value={form.reservationUrl}
                  onChange={(v) => set("reservationUrl", v)}
                  dir="ltr"
                  placeholder="https://…"
                />
              </Field>
              <Field label="מספר טלפון">
                <BigInput
                  value={form.phone}
                  onChange={(v) => set("phone", v)}
                  inputMode="tel"
                  dir="ltr"
                  placeholder="+972…"
                />
              </Field>
              <Field label="קישור לתמונה">
                <BigInput
                  value={form.imageUrl}
                  onChange={(v) => set("imageUrl", v)}
                  dir="ltr"
                  placeholder="https://…"
                />
              </Field>
              <Field label="קישור לאינסטגרם">
                <div className="flex gap-1.5">
                  <BigInput
                    value={form.instagramUrl}
                    onChange={(v) => set("instagramUrl", v)}
                    dir="ltr"
                    placeholder="https://instagram.com/…"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const q = `${form.name || form.query} ${form.area || "תל אביב"} Instagram`.trim();
                      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
                      const a = document.createElement("a");
                      a.href = url;
                      a.target = "_blank";
                      a.rel = "noopener noreferrer";
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                    }}
                    className="shrink-0 whitespace-nowrap rounded-2xl bg-white px-3 text-[11px] font-semibold text-[var(--brand-navy)] ring-1 ring-black/10 hover:bg-black/[.04]"
                  >
                    חפש אינסטגרם
                  </button>
                </div>
              </Field>

              <label className="flex items-center gap-2 pt-1 text-sm text-[var(--brand-navy)]">
                <input
                  type="checkbox"
                  checked={form.verified}
                  onChange={(e) => set("verified", e.target.checked)}
                  className="h-4 w-4 accent-[var(--brand-pink)]"
                />
                מאומת
              </label>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 translate-y-px" />
              {error}
            </div>
          )}
        </div>

        {/* Sticky save */}
        <div className="shrink-0 border-t border-black/5 bg-white px-5 pb-[max(env(safe-area-inset-bottom),14px)] pt-3">
          <button
            onClick={handleSave}
            className="w-full rounded-2xl bg-[image:var(--gradient-brand)] py-3.5 text-sm font-bold text-white shadow-[var(--shadow-float)] active:scale-[.99]"
          >
            {isEdit ? "שמור שינויים" : "שמור והוסף למפה"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-[var(--brand-navy)]/80">
        {label}
        {required && <span className="ms-1 text-[var(--brand-pink)]">*</span>}
      </span>
      {children}
    </label>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function DebugRow({ k, v, link }: { k: string; v?: string; link?: boolean }) {
  const val = (v ?? "").toString();
  return (
    <div className="flex gap-2 border-b border-amber-200/60 py-1 last:border-0">
      <span className="w-32 shrink-0 font-semibold">{k}:</span>
      {val ? (
        link && /^https?:\/\//i.test(val) ? (
          <a
            href={val}
            target="_blank"
            rel="noopener noreferrer"
            dir="ltr"
            className="min-w-0 flex-1 truncate text-blue-700 underline"
          >
            {val}
          </a>
        ) : (
          <span dir="ltr" className="min-w-0 flex-1 break-all">
            {val}
          </span>
        )
      ) : (
        <span className="text-amber-700/60">—</span>
      )}
    </div>
  );
}

function DealItemsInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // The wire format stays a single string joined by \n, so save logic and the
  // VenueBottomCard bullet-renderer keep working unchanged.
  const items = value.length > 0 ? value.split(/\r?\n/) : [""];
  const update = (next: string[]) => {
    onChange(next.join("\n").replace(/\n+$/, ""));
  };
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={item}
            onChange={(e) => {
              const next = items.slice();
              next[i] = e.target.value;
              update(next);
            }}
            placeholder={
              i === 0
                ? "למשל: 50% הנחה על בקבוקי יין"
                : "פריט דיל נוסף"
            }
            className="min-w-0 flex-1 rounded-2xl bg-black/[.04] px-4 py-3 text-sm outline-none focus:bg-black/[.07]"
          />
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => update(items.filter((_, j) => j !== i))}
              aria-label="הסר פריט"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/[.04] text-muted-foreground transition hover:bg-black/[.08] hover:text-[var(--brand-navy)]"
            >
              <Minus className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => update([...items, ""])}
        className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--brand-pink)_10%,white)] px-3 py-1.5 text-[12px] font-semibold text-[var(--brand-pink)] ring-1 ring-[color-mix(in_oklab,var(--brand-pink)_25%,transparent)] transition hover:bg-[color-mix(in_oklab,var(--brand-pink)_16%,white)]"
      >
        <Plus className="h-3.5 w-3.5" />
        הוסף פריט דיל
      </button>
    </div>
  );
}

function BigInput(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  dir?: "ltr" | "rtl";
}) {
  return (
    <input
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      type={props.type}
      inputMode={props.inputMode}
      dir={props.dir}
      placeholder={props.placeholder}
      className="w-full rounded-2xl bg-black/[.04] px-4 py-3 text-sm outline-none focus:bg-black/[.07]"
    />
  );
}

function TimeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [h, m] = value ? value.split(":") : ["", ""];
  const hours = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, "0"),
  );
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
  const update = (nh: string, nm: string) => {
    if (nh && nm) onChange(`${nh}:${nm}`);
    else if (!nh && !nm) onChange("");
    else onChange(`${nh || "00"}:${nm || "00"}`);
  };
  const selectCls =
    "flex-1 rounded-2xl bg-black/[.04] px-3 py-3 text-sm font-semibold text-[var(--brand-navy)] outline-none focus:bg-black/[.07]";
  return (
    <div dir="ltr" className="flex items-center gap-1.5">
      <select
        className={selectCls}
        value={h}
        onChange={(e) => update(e.target.value, m)}
      >
        <option value="">--</option>
        {hours.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <span className="text-sm font-bold text-muted-foreground">:</span>
      <select
        className={selectCls}
        value={m}
        onChange={(e) => update(h, e.target.value)}
      >
        <option value="">--</option>
        {minutes.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </div>
  );
}
