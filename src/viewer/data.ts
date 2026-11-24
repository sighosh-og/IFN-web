import raw from '../data/photoReviews.json';

export type Photo = { src: string; review: string; w: number; h: number };
export type Review = (typeof raw.reviews)[number];

export const photos: Photo[] = raw.photos;
export const totalPhotos: number = raw.total;
export const reviewsById = new Map<string, Review>(raw.reviews.map((r) => [r.id, r]));
export const reviewOrder = raw.reviews.map((r) => r.id);

/** Index of the first photo of a review in the flat photo list. */
export const firstPhotoOf = (reviewId: string) => photos.findIndex((p) => p.review === reviewId);
/** Photos of the same review, in order, with their flat indices. */
export const siblingsOf = (index: number) => {
  const id = photos[index]?.review;
  return photos.map((p, i) => ({ ...p, index: i })).filter((p) => p.review === id);
};
