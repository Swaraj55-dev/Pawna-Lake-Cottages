/** Plain data passed to email templates (no server imports, so templates stay previewable/testable). */
export type EmailBooking = {
  id: string;
  code: string;
  cottageName: string;
  cottagesCount: number;
  checkIn: string; // formatted, e.g. "Fri, 4 Dec 2026, 4:00 PM"
  checkOut: string;
  nights: number;
  guests: number;
  name: string;
  phone: string;
  email: string | null;
  partySummary: string;
  foodSummary: string | null;
  notes: string | null;
  total: string; // formatted INR
  paid: string;
  balance: string;
  source: string;
  statusNote: string | null;
};

export type EmailSite = {
  name: string;
  address: string;
  phone: string;
  whatsappUrl: string | null;
  directionsUrl: string;
  siteUrl: string;
  bookingUrl: string;
  adminUrl: string;
  cancellationPolicy: string;
  checkInNote: string;
};
