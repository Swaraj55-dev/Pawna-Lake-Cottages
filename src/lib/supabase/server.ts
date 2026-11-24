import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { NotConfiguredError } from "@/lib/errors";

/**
 * Cookie-based Supabase client for the *signed-in user* (admin auth).
 * Use in Server Components, Server Actions and Route Handlers.
 */
export async function createAuthClient() {
  // Auth is always per request: keep it out of any (runtime) prerender, where
  // the Supabase client's Date.now() calls would otherwise be rejected.
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new NotConfiguredError("Admin login");
  const store = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component (read-only cookies) — the Proxy refreshes sessions.
        }
      },
    },
  });
}
