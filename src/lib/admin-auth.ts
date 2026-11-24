import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isAdminEmail } from "./admin-emails";
import { isSupabaseConfigured } from "./supabase/admin";
import { createAuthClient } from "./supabase/server";

export type Admin = { email: string };

/** The signed-in admin, or null (not signed in / not on the ADMIN_EMAIL allow-list). */
export async function getAdmin(): Promise<Admin | null> {
  await connection(); // per-request only (see createAuthClient)
  if (!isSupabaseConfigured()) return null;
  const supabase = await createAuthClient();
  // getUser() validates the JWT with Supabase (getSession() alone would trust the cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email && isAdminEmail(user.email) ? { email: user.email.toLowerCase() } : null;
}

/**
 * Data Access Layer gate: call at the top of EVERY admin page, Server Action and
 * admin Route Handler. Never rely on the Proxy alone.
 */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
