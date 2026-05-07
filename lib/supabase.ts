import { createServerClient, createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "placeholder";

// Server-side admin (service key, bypasses RLS — only use in API routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// For client components (browser-side only)
export function createBrowserSupabase() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// For API routes — pass in cookies() from next/headers
export function createApiClient(
  getAll: () => { name: string; value: string }[],
  setAll?: (cookies: { name: string; value: string; options: Record<string, unknown> }[]) => void
) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll,
      setAll: setAll ?? (() => {}),
    },
  });
}

export { createServerClient, createBrowserClient };
