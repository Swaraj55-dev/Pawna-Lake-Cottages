import { NextResponse, after } from "next/server";
import { AppError, errorResponse, noStore } from "@/lib/errors";
import { isEmailConfigured, sendContactEmail } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { contactSchema } from "@/lib/validation";

/**
 * POST /api/contact { name, email, phone?, message, website(honeypot) }
 * Saves to contact_messages (if Supabase is configured) and emails ADMIN_EMAIL.
 */
export async function POST(request: Request) {
  try {
    if (!rateLimit(`contact:${clientIp(request)}`, 5, 10 * 60_000)) {
      throw new AppError("RATE_LIMITED", "Too many messages — please try again in a few minutes, or WhatsApp us.", 429);
    }
    const raw = await request.json().catch(() => null);
    // Bots that fill the hidden field get a normal-looking success and nothing is stored.
    if (raw && typeof raw === "object" && typeof raw.website === "string" && raw.website.length > 0) {
      return NextResponse.json({ ok: true }, { headers: noStore });
    }
    const m = contactSchema.parse(raw);

    if (!isSupabaseConfigured() && !isEmailConfigured()) {
      throw new AppError("NOT_CONFIGURED", "Our contact form isn't set up yet — please WhatsApp or call us.", 503);
    }

    let id: string = crypto.randomUUID();
    if (isSupabaseConfigured()) {
      const { data, error } = await getServiceClient()
        .from("contact_messages")
        .insert({ name: m.name, email: m.email, phone: m.phone || null, message: m.message })
        .select("id")
        .single();
      if (error) throw new Error(`contact insert failed: ${error.message}`);
      id = (data as { id: string }).id;
    }
    after(() => sendContactEmail({ id, name: m.name, email: m.email, phone: m.phone, message: m.message }));
    return NextResponse.json({ ok: true }, { status: 201, headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
