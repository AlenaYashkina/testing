import { createClient } from "@supabase/supabase-js";

import { requireServerEnv, type ServerEnv } from "@/lib/env";

function buildClient(url: string, key: string) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createSupabaseAdminClient() {
  const env = requireServerEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  return buildClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createSupabaseReadClient() {
  const env = requireServerEnv(["SUPABASE_URL"]);
  const key = resolveReadKey(env);

  if (!key) {
    throw new Error(
      "Missing SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY for read-only access.",
    );
  }

  return buildClient(env.SUPABASE_URL, key);
}

function resolveReadKey(env: ServerEnv): string | undefined {
  return env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY;
}
