import type { BookingRow } from "@/lib/supabase/types";

type GuestCounts = Pick<BookingRow, "adult_count" | "child_half_count" | "child_free_count">;
type FoodCounts = Pick<BookingRow, "food_veg_count" | "food_non_veg_count" | "food_jain_count">;

export function formatGuestParty(booking: GuestCounts) {
  const items = [
    booking.adult_count > 0 && `${booking.adult_count} adult${booking.adult_count === 1 ? "" : "s"} (11+)`,
    booking.child_half_count > 0 && `${booking.child_half_count} child${booking.child_half_count === 1 ? "" : "ren"} (5–10)`,
    booking.child_free_count > 0 && `${booking.child_free_count} child${booking.child_free_count === 1 ? "" : "ren"} under 5`,
  ].filter(Boolean);
  return items.join(", ") || "Guest ages not recorded";
}

export function formatFoodCounts(booking: FoodCounts) {
  const items = [
    booking.food_veg_count > 0 && `${booking.food_veg_count} Veg`,
    booking.food_non_veg_count > 0 && `${booking.food_non_veg_count} Non-veg`,
    booking.food_jain_count > 0 && `${booking.food_jain_count} Jain`,
  ].filter(Boolean);
  return items.join(", ") || "Not specified";
}
