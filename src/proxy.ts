import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAdminEmail } from "@/lib/admin-emails";

/**
 * Runs before /admin/* and /api/admin/*:
 *  - refreshes the Supabase auth session cookie, and
 *  - redirects anyone who isn't an allow-listed admin to /admin/login early.
 * Every admin page / Server Action / route ALSO calls requireAdmin() itself.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Not configured: let the pages render their setup notice.
  if (!url || !anon) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowed = isAdminEmail(user?.email);
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";

  if (!allowed && !isLogin) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    const to = request.nextUrl.clone();
    to.pathname = "/admin/login";
    to.search = user ? "?error=forbidden" : "";
    return NextResponse.redirect(to);
  }
  if (allowed && isLogin) {
    const to = request.nextUrl.clone();
    to.pathname = "/admin";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
