import { z } from "zod";

const envSchema = z.object({
  RETAILCRM_BASE_URL: z.string().url().optional(),
  RETAILCRM_API_KEY: z.string().min(1).optional(),
  RETAILCRM_SITE_CODE: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_CHAT_ID: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  HIGH_VALUE_THRESHOLD: z.coerce.number().positive().default(50000),
});

export type ServerEnv = z.infer<typeof envSchema>;
export type ServerEnvKey = keyof ServerEnv;

export function readServerEnv(): ServerEnv {
  return envSchema.parse(process.env);
}

export function requireServerEnv<K extends ServerEnvKey>(
  keys: readonly K[],
): ServerEnv & Required<Pick<ServerEnv, K>> {
  const env = readServerEnv();
  const missing = keys.filter((key) => {
    const value = env[key];
    return value === undefined || value === "";
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  return env as ServerEnv & Required<Pick<ServerEnv, K>>;
}
