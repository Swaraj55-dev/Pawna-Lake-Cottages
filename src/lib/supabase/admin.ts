import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NotConfiguredError } from "@/lib/errors";

let anonClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

/**
 * Least-privilege server client (anon key): only what RLS allows the public —
 * availability RPC, cottage types, price overrides.
 */
export function getPublicClient(): SupabaseClient {
  if (!isSupabaseConfigured()) throw new NotConfiguredError("Online booking");
  anonClient ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, opts);
  return anonClient;
}

/**
 * Service-role client — bypasses RLS. Server-only; use exclusively for
 * create_booking, payment confirmation, contact messages and verified admin actions.
 */
export function getServiceClient(): SupabaseClient {
  if (!isSupabaseConfigured()) throw new NotConfiguredError("Online booking");
  serviceClient ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, opts);
  return serviceClient;
}
