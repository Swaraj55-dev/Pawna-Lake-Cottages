// Row types mirroring supabase/migrations/*.sql
import type { CottageSlug } from "@/config/site";
import type { ISODate } from "@/lib/dates";

export type BookingStatus = "pending_payment" | "confirmed" | "cancelled" | "completed";
export type BookingSource = "website" | "whatsapp" | "phone" | "walk_in";
export type FoodPref = "veg" | "non_veg" | "jain";

export type BookingRow = {
  id: string;
  booking_code: string;
  cottage_slug: CottageSlug;
  check_in: ISODate;
  check_out: ISODate;
  nights: number;
  guests: number;
  cottages_count: number;
  name: string;
  phone: string;
  email: string | null;
  food_pref: FoodPref | null;
  adult_count: number;
  child_half_count: number;
  child_free_count: number;
  food_veg_count: number;
  food_non_veg_count: number;
  food_jain_count: number;
  notes: string | null;
  total_amount: number;
  advance_amount: number;
  amount_paid: number;
  price_breakdown: unknown;
  status: BookingStatus;
  status_note: string | null;
  source: BookingSource;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  expires_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GuestReviewStatus = "pending" | "approved" | "rejected";

export type GuestReviewRow = {
  id: string;
  name: string;
  cottage_slug: CottageSlug;
  rating: number;
  review: string;
  status: GuestReviewStatus;
  created_at: string;
};

export type AvailabilityRow = {
  night: ISODate;
  units_total: number;
  booked: number;
  blocked: number;
  available: number;
};

export type PriceOverrideRow = {
  id: string;
  cottage_slug: CottageSlug;
  date: ISODate;
  price_per_person: number;
  label: string | null;
};

export type BlockedDateRow = {
  id: string;
  cottage_slug: CottageSlug;
  date: ISODate;
  units_blocked: number | null;
  reason: string | null;
};
