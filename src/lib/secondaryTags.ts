// Curated secondary tags (cuisines, vibes, features) shown under "עוד סינונים".
// These are separate from the main category chips.

export const SECONDARY_TAG_GROUPS: { label: string; tags: string[] }[] = [
  {
    label: "מטבחים",
    tags: [
      "איטלקי",
      "תאילנדי",
      "יפני",
      "סושי",
      "אסייתי",
      "מקסיקני",
      "ים תיכוני",
      "בורגר",
      "פיצה",
      "בראנץ׳",
    ],
  },
  {
    label: "משקאות",
    tags: ["קוקטיילים", "יין", "בירה", "בר יין", "בר קוקטיילים"],
  },
  {
    label: "אווירה",
    tags: [
      "רומנטי",
      "קליל",
      "שקט",
      "רועש",
      "יוקרתי",
      "שכונתי",
      "טרנדי",
      "אינטימי",
      "דייט ראשון",
      "קבוצה",
    ],
  },
  {
    label: "עוד",
    tags: ["בלי להזמין", "גג", "חצר", "טבעוני", "כשר", "פתוח מאוחר", "עד 50₪"],
  },
];

export const ALL_SECONDARY_TAGS: string[] = SECONDARY_TAG_GROUPS.flatMap(
  (g) => g.tags,
);

export function venueMatchesTag(
  v: { tags?: string[]; dealTitle?: string; dealDescription?: string; notes?: string; name?: string; category?: string },
  tag: string,
): boolean {
  const t = tag.toLowerCase();
  if (v.tags && v.tags.some((x) => x.toLowerCase() === t)) return true;
  const hay = [v.name, v.category, v.dealTitle, v.dealDescription, v.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(t);
}
