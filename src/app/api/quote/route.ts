import { NextResponse } from "next/server";
import { errorResponse, noStore } from "@/lib/errors";
import { getServerQuote } from "@/lib/quote";
import { stayRequestSchema } from "@/lib/validation";

/**
 * POST /api/quote  { type, checkIn, checkOut, guests, cottages }
 * -> { cottage, quote, unitsLeft, available }
 * The price is always computed here on the server.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const stay = stayRequestSchema.parse(body);
    const result = await getServerQuote(stay);
    return NextResponse.json(result, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
