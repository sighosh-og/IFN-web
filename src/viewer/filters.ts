import { photos, reviewOrder, reviewsById } from './data';

/*
 * Gallery filters (Figma flow 4, 5400:6224). One state drives both the header chips and the Filters modal.
 * Sort is single select (Most helpful by default), Rating is multi select, Variant + Verified are toggles.
 */
export type Sort = 'helpful' | 'recent' | 'high' | 'low';
export type Filters = { sort: Sort; ratings: number[]; variant: boolean; verified: boolean };

export const DEFAULT_FILTERS: Filters = { sort: 'helpful', ratings: [], variant: false, verified: false };

export const SORTS: { id: Sort; label: string }[] = [
  { id: 'helpful', label: 'Most helpful' },
  { id: 'recent', label: 'Most recent' },
  { id: 'high', label: 'Rating: high to low' },
  { id: 'low', label: 'Rating: low to high' },
];

/** The variant open on the PDP — "Show reviews for this variant" keeps reviews written for it. */
export const THIS_VARIANT = {
  name: 'iPhone 17 Pro Max',
  chips: ['Silver', '256 GB', 'International Version'],
  image: 'https://f.nooncdn.com/p/pzsku/Z4C9C7741BAB2EC64D3F7Z/45/_/1779095234/747f6105-3427-46c3-9636-fc776f031f11.jpg',
};

const valueOf = (id: string, label: string) =>
  reviewsById.get(id)?.variants.find((v) => v.label === label)?.value.toLowerCase() ?? '';

const isThisVariant = (id: string) =>
  valueOf(id, 'Model Name') === 'iphone 17 pro max' &&
  valueOf(id, 'Color') === 'silver' &&
  valueOf(id, 'Internal Memory') === '256 gb' &&
  valueOf(id, 'Version').startsWith('international version');

/** Filter (n): every group that is not on its default — sort, rating, variant and verified. */
export const activeCount = (f: Filters) =>
  Number(f.sort !== 'helpful') + Number(f.ratings.length > 0) + Number(f.variant) + Number(f.verified);

export const sameFilters = (a: Filters, b: Filters) =>
  a.sort === b.sort && a.variant === b.variant && a.verified === b.verified &&
  a.ratings.length === b.ratings.length && a.ratings.every((r) => b.ratings.includes(r));

/**
 * Photo indices in display order for these filters. Reviews are filtered + sorted, then each review keeps its
 * photos together in their own order. Most helpful = the order the reviews API returns (noon's own ranking).
 */
export function photoOrder(f: Filters): number[] {
  const rank = new Map(reviewOrder.map((id, i) => [id, i]));
  const ids = reviewOrder.filter((id) => {
    const r = reviewsById.get(id)!;
    if (f.ratings.length && !f.ratings.includes(r.rating)) return false;
    if (f.verified && !r.verified) return false;
    if (f.variant && !isThisVariant(id)) return false;
    return true;
  });
  const by = (key: (id: string) => number) => (a: string, b: string) => key(a) - key(b) || rank.get(a)! - rank.get(b)!;
  const rating = (id: string) => reviewsById.get(id)!.rating;
  const time = (id: string) => Date.parse(reviewsById.get(id)!.date);
  if (f.sort === 'recent') ids.sort(by((id) => -time(id)));
  else if (f.sort === 'high') ids.sort(by((id) => -rating(id)));
  else if (f.sort === 'low') ids.sort(by(rating));
  const byReview = new Map<string, number[]>();
  photos.forEach((p, i) => byReview.set(p.review, [...(byReview.get(p.review) ?? []), i]));
  return ids.flatMap((id) => byReview.get(id) ?? []);
}

export const ALL_PHOTOS = photos.map((_, i) => i);
