import {  type Venue } from "@/data/mockVenues";

export type DealItem = {
  description: string;
  dealDays?: string[]; // Hebrew tokens like ["א׳","ב׳"]
  dealStart?: string; // "HH:mm"
  dealEnd?: string; // "HH:mm"
  allDay?: boolean;
  priceRange?: string;
  notes?: string;
};

const HEB_DAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

function normTok(s: string): string {
  return s.replace(/[׳'']/g, "").trim();
}

export function dayTokensMatch(days: string[] | undefined, todayIdx: number): boolean {
  if (!days || days.length === 0) return true;
  const today = HEB_DAYS[todayIdx];
  // Detect range like "א׳-ה׳" embedded
  const joined = days.join(" ");
  const range = joined.match(/([אבגדהוש])[׳']?\s*[–\-]\s*([אבגדהוש])/);
  if (range) {
    const s = HEB_DAYS.indexOf(range[1]);
    const e = HEB_DAYS.indexOf(range[2]);
    if (s !== -1 && e !== -1) {
      if (s <= e) return todayIdx >= s && todayIdx <= e;
      return todayIdx >= s || todayIdx <= e;
    }
  }
  return days.some((d) => normTok(d).startsWith(today));
}

export function parseDealDaysString(s?: string): string[] {
  if (!s) return [];
  // Expand ranges like "א׳-ה׳"
  const range = s.match(/([אבגדהוש])[׳']?\s*[–\-]\s*([אבגדהוש])/);
  if (range) {
    const a = HEB_DAYS.indexOf(range[1]);
    const b = HEB_DAYS.indexOf(range[2]);
    if (a !== -1 && b !== -1) {
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      return HEB_DAYS.slice(lo, hi + 1).map((d) =>
        d === "ש" ? "שבת" : d + "׳",
      );
    }
  }
  return s.split(/[,،/\s]+/).map((t) => t.trim()).filter(Boolean);
}

export function getDeals(v: Venue): DealItem[] {
  const raw = (v as Venue & { deals?: DealItem[] }).deals;
  if (Array.isArray(raw) && raw.length > 0) return raw;
  // Backward-compat: synthesize from top-level legacy fields.
  const legacyDays = parseDealDaysString(v.dealDays);
  return [
    {
      description: v.dealDescription || v.dealTitle || "",
      dealDays: legacyDays,
      dealStart: v.dealStart,
      dealEnd: v.dealEnd,
      allDay: !v.dealStart && !v.dealEnd,
    },
  ];
}

function parseHM(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

export type DealStatus =
  | { kind: "active"; endsInMin: number }
  | { kind: "soon"; startsInMin: number }
  | { kind: "later"; startsInMin: number }
  | { kind: "ended" }
  | { kind: "allDay" }
  | { kind: "notToday" };

export function dealStatus(d: DealItem, now = new Date()): DealStatus {
  const today = now.getDay();
  const isToday = dayTokensMatch(d.dealDays, today);
  if (d.allDay || (!d.dealStart && !d.dealEnd)) {
    return isToday ? { kind: "allDay" } : { kind: "notToday" };
  }
  if (!isToday) return { kind: "notToday" };
  const s = parseHM(d.dealStart);
  const e = parseHM(d.dealEnd);
  if (s == null || e == null) return { kind: "allDay" };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin < s) {
    const startsIn = s - nowMin;
    return startsIn <= 60
      ? { kind: "soon", startsInMin: startsIn }
      : { kind: "later", startsInMin: startsIn };
  }
  if (nowMin >= s && nowMin < e) return { kind: "active", endsInMin: e - nowMin };
  return { kind: "ended" };
}

function rank(st: DealStatus): number {
  switch (st.kind) {
    case "active": return 0;
    case "allDay": return 1;
    case "soon": return 2;
    case "later": return 3;
    case "ended": return 4;
    case "notToday": return 5;
  }
}

export function pickPrimaryDeal(
  v: Venue,
  now = new Date(),
): { deal: DealItem; status: DealStatus; index: number } | null {
  const deals = getDeals(v);
  if (deals.length === 0) return null;
  let best: { deal: DealItem; status: DealStatus; index: number } | null = null;
  deals.forEach((d, i) => {
    const st = dealStatus(d, now);
    if (!best || rank(st) < rank(best.status)) {
      best = { deal: d, status: st, index: i };
    }
  });
  return best;
}

export function isAnyDealActiveNow(v: Venue, now = new Date()): boolean {
  if (v.active === false) return false;
  return getDeals(v).some((d) => {
    const st = dealStatus(d, now);
    return st.kind === "active" || st.kind === "allDay";
  });
}

export function getCategoryKeys(v: Venue): string[] {
  const arr = (v as Venue & { categoryKeys?: string[] }).categoryKeys;
  if (Array.isArray(arr) && arr.length > 0) return arr;
  return v.categoryKey ? [v.categoryKey] : [];
}


/**
 * Extract the headline numeric deal value ("30%", "1+1", "₪39") plus the
 * remaining descriptive text. Used for the map-pin label and brutalist
 * deal typography on cards.
 */
export function extractDealValue(
  text?: string | null,
): { value: string | null; label: string } {
  if (!text) return { value: null, label: "" };
  const re = /(\d+\s*%|\d+\s*\+\s*\d+|₪\s*\d+(?:\.\d+)?|\$\s*\d+(?:\.\d+)?)/;
  const m = text.match(re);
  if (!m || m.index == null) return { value: null, label: text.trim() };
  const value = m[0].replace(/\s+/g, "");
  const label = (text.slice(0, m.index) + text.slice(m.index + m[0].length))
    .replace(/[·•\-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { value, label };
}

/** Short label for a map-pin: the deal value if present, else null. */
export function pinDealLabel(v: Venue, now = new Date()): string | null {
  const p = pickPrimaryDeal(v, now);
  if (!p) return null;
  if (p.status.kind === "notToday" || p.status.kind === "ended") return null;
  const { value } = extractDealValue(p.deal.description);
  return value;
}

/** Format a remaining/active time duration in Hebrew.
 *  Examples: 24 → "24 דק'", 75 → "שעה ו-15 דקות", 120 → "2 שעות", 180 → "3 שעות".
 *  Never returns raw values like "126 דק'".
 */
export function formatDurationHebrew(minutes: number): string {
  if (minutes < 60) return `${minutes} דק'`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hoursText = h === 1 ? "שעה" : `${h} שעות`;
  if (m === 0) return hoursText;
  if (m === 1) return `${hoursText} ודקה`;
  return `${hoursText} ו-${m} דקות`;
}


