import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/admin-auth";
import { bookingsToCsv, parseFilters, queryBookings } from "@/lib/admin/bookings";

/** GET /api/admin/bookings.csv?<same filters as /admin> — admin only. */
export async function GET(request: NextRequest) {
  if (!(await getAdmin())) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const filters = parseFilters(Object.fromEntries(request.nextUrl.searchParams));
  const { rows } = await queryBookings(filters, { all: true });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(bookingsToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
