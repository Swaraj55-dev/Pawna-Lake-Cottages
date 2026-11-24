import type { CottageSlug } from "@/config/site";
import type { ISODate } from "@/lib/dates";
import type { GuestBreakdown } from "@/lib/pricing";
import type { GuestDetailsInput } from "@/lib/validation";

export type BookCottage = {
  slug: CottageSlug;
  name: string;
  shortDesc: string;
  maxGuests: number;
  baseGuests: number;
  unitsAvailable: number;
  fromPrice: string | null;
  image: { src: string; alt: string; blurDataURL?: string } | null;
};

export type Draft = {
  type: CottageSlug | null;
  checkIn: ISODate | null;
  checkOut: ISODate | null;
  guests: number;
  party: GuestBreakdown;
  cottages: number;
  details: Partial<GuestDetailsInput> | null;
};

export const EMPTY_DRAFT: Draft = {
  type: null,
  checkIn: null,
  checkOut: null,
  guests: 2,
  party: { adults: 2, childrenHalf: 0, childrenFree: 0 },
  cottages: 1,
  details: null,
};
