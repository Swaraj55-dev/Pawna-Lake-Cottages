import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { todayIST } from "@/lib/dates";
import { ManualBookingForm } from "@/components/admin/manual-booking-form";

export const metadata: Metadata = { title: "New booking" };

async function Gate() {
  await requireAdmin();
  await connection();
  return <ManualBookingForm today={todayIST()} />;
}

export default function NewBookingPage() {
  return (
    <>
      <h1 className="mb-2 text-3xl">New booking</h1>
      <p className="mb-6 text-muted-foreground">For bookings taken on WhatsApp, phone or walk-in. Saved as confirmed.</p>
      <Suspense fallback={null}>
        <Gate />
      </Suspense>
    </>
  );
}
