import "server-only";
import { z } from "zod";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { BookingRow } from "@/lib/supabase/types";

const uuid = z.uuid();

/** Booking by its (unguessable) UUID, or null. Returns null if Supabase isn't configured. */
export async function getBookingById(id: string): Promise<BookingRow | null> {
  if (!uuid.safeParse(id).success || !isSupabaseConfigured()) return null;
  const { data, error } = await getServiceClient().from("bookings").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getBookingById failed: ${error.message}`);
  return (data as BookingRow | null) ?? null;
}
