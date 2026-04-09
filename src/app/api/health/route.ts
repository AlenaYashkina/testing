import { NextResponse } from "next/server";

import { readServerEnv } from "@/lib/env";

export async function GET() {
  const env = readServerEnv();

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    integrations: {
      retailcrm: Boolean(env.RETAILCRM_BASE_URL && env.RETAILCRM_API_KEY),
      supabase: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
      telegram: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
      cronSecret: Boolean(env.CRON_SECRET),
    },
  });
}
