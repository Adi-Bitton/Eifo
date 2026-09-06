export type CategoryKey =
  | "food"
  | "drink"
  | "coffee"
  | "cheap"
  | "date"
  | "friends"
  | "beach"
  | "other";

export const CATEGORIES: { key: CategoryKey; label: string; emoji: string }[] = [
  { key: "food", label: "אוכל", emoji: "🍽️" },
  { key: "drink", label: "דרינק", emoji: "🍹" },
  { key: "coffee", label: "קפה", emoji: "☕" },
  { key: "cheap", label: "זול", emoji: "💸" },
  { key: "date", label: "דייט", emoji: "❤️" },
  { key: "friends", label: "חברים", emoji: "👯" },
  { key: "beach", label: "ים", emoji: "🌊" },
  { key: "other", label: "אחר", emoji: "📍" },
];

export function categoryEmoji(key?: CategoryKey | string) {
  return CATEGORIES.find((c) => c.key === key)?.emoji ?? "📍";
}
export function categoryLabel(key?: CategoryKey | string) {
  return CATEGORIES.find((c) => c.key === key)?.label ?? "אחר";
}

export type VenueDealItem = {
  description: string;
  dealDays?: string[];
  dealStart?: string;
  dealEnd?: string;
  allDay?: boolean;
  priceRange?: string;
  notes?: string;
};

export type Venue = {
  id: string;
  name: string;
  category: string; // legacy display label
  categoryKey?: CategoryKey;
  categoryKeys?: string[]; // multi-tag (up to 3)
  emoji: string;
  lat: number;
  lng: number;
  area?: string;
  address?: string;
  imageUrl?: string;
  rating?: number;
  reviewsCount?: number;
  phone?: string;
  navUrl?: string;
  reservationUrl?: string;
  googleUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  dealTitle: string;
  dealDescription?: string;
  dealWindow: string;
  dealDays?: string;
  dealStart?: string;
  dealEnd?: string;
  deals?: VenueDealItem[]; // multiple independent deal items
  priceRange?: string;
  priceLevel?: 1 | 2 | 3;
  notes?: string;
  verified?: boolean;
  distanceM?: number;
  active?: boolean;
  custom?: boolean;
  tags?: string[]; // secondary tags (cuisines, vibes, etc.)
};

/** Placeholder venues cleared — real businesses are entered through the app. */
export const mockVenues: Venue[] = [];
