import { NextResponse, type NextRequest } from "next/server";
import { getCottage } from "@/config/site";
import { getMonthAvailability } from "@/lib/availability";
import { errorResponse, noStore } from "@/lib/errors";
import { availabilityQuerySchema } from "@/lib/validation";

/**
 * GET /api/availability?type=aroma&month=2026-12
 * -> { type, month, unitsTotal, nights: [{ date, available, status }] }
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const { type, month } = availabilityQuerySchema.parse({ type: sp.get("type"), month: sp.get("month") });
    const nights = await getMonthAvailability(type, month);
    return NextResponse.json(
      { type, month, unitsTotal: getCottage(type)!.unitsAvailable, nights },
      { headers: noStore },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
