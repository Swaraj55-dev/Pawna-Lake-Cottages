import { describe, expect, it } from "vitest";
import { render } from "@react-email/components";
import AdminContactEmail from "./admin-contact";
import BookingConfirmationEmail from "./booking-confirmation";
import AdminNewBookingEmail from "./admin-new-booking";
import AdminPaymentIssueEmail from "./admin-payment-issue";
import type { EmailBooking, EmailSite } from "./types";

// Fake test data only.
const b: EmailBooking = {
  id: "00000000-0000-4000-8000-000000000001",
  code: "PWN-8F3K2",
  cottageName: "Aroma Cottage",
  cottagesCount: 1,
  checkIn: "Fri, 4 Dec 2026, 4:00 PM",
  checkOut: "Sun, 6 Dec 2026, 11:00 AM",
  nights: 2,
  guests: 3,
  name: "Test Guest",
  phone: "9876543210",
  email: "guest@example.com",
  partySummary: "2 adults, 1 child (5–10)",
  foodSummary: "2 Veg, 1 Non-veg",
  notes: "Anniversary <script>alert(1)</script>",
  total: "₹14,000",
  paid: "₹7,000",
  balance: "₹7,000",
  source: "website",
  statusNote: null,
};
const site: EmailSite = {
  name: "Test Camp",
  address: "Test address, Pawna Lake",
  phone: "+910000000000",
  whatsappUrl: "https://wa.me/910000000000",
  directionsUrl: "https://maps.example/dir",
  siteUrl: "https://example.com",
  bookingUrl: "https://example.com/book/success/x",
  adminUrl: "https://example.com/admin",
  cancellationPolicy: "",
  checkInNote: "Bring ID.",
};

describe("emails", () => {
  it("guest confirmation has code, dates, amounts, directions and WhatsApp", async () => {
    const html = await render(<BookingConfirmationEmail b={b} site={site} />);
    for (const s of ["PWN-8F3K2", "Fri, 4 Dec 2026, 4:00 PM", "₹7,000", "Balance at check-in", "2 adults, 1 child (5–10)", "2 Veg, 1 Non-veg", "https://maps.example/dir", "https://wa.me/910000000000", "You&#x27;re booked, Test!"]) {
      expect(html).toContain(s);
    }
    // guest email must not leak admin-only data
    expect(html).not.toContain("9876543210");
  });

  it("hides WhatsApp button when no number is configured", async () => {
    const html = await render(<BookingConfirmationEmail b={b} site={{ ...site, whatsappUrl: null }} />);
    expect(html).not.toContain("WhatsApp us");
  });

  it("renders a contact alert when the visitor omits their optional email", async () => {
    const html = await render(
      <AdminContactEmail
        brand={site.name}
        m={{ name: "Test Guest", email: null, phone: "9876543210", message: "Please share booking details." }}
      />,
    );

    expect(html).toContain("Not provided");
    expect(html).toContain("9876543210");
    expect(html).toContain("Call Test Guest at 9876543210 to follow up.");
  });

  it("admin alert includes contact details and escapes guest input", async () => {
    const html = await render(<AdminNewBookingEmail b={b} site={site} />);
    expect(html).toContain("9876543210");
    expect(html).toContain("guest@example.com");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("payment issue email names the payment to refund", async () => {
    const html = await render(<AdminPaymentIssueEmail b={b} site={site} issue="refund_required" paymentId="pay_TEST123" />);
    expect(html).toContain("pay_TEST123");
    expect(html).toContain("refund needed");
  });
});
