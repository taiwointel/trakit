import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS.
// Only use in server-side Route Handlers that have no user session
// (e.g. the Telegram webhook, which is called by Telegram's servers,
// not by the authenticated user).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
