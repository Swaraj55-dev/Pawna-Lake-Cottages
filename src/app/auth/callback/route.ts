import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";
import { createAuthClient } from "@/lib/supabase/server";

/**
 * Magic-link landing. Supports both Supabase flows:
 *  - PKCE:        /auth/callback?code=...
 *  - token hash:  /auth/callback?token_hash=...&type=magiclink|email
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const fail = (reason: string) => NextResponse.redirect(`${origin}/admin/login?error=${reason}`);

  let supabase;
  try {
    supabase = await createAuthClient();
  } catch {
    return fail("not_configured");
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };
  if (error) return fail("link_invalid");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    await supabase.auth.signOut();
    return fail("forbidden");
  }
  return NextResponse.redirect(`${origin}/admin`);
}
