import type { PostgrestError } from "@supabase/supabase-js";

import { readServerEnv, requireServerEnv } from "@/lib/env";
import {
  buildTelegramMessage,
  pickOrdersForNotification,
  type NotifiableOrder,
} from "@/lib/notifications";
import { mapRetailCrmOrderToRow } from "@/lib/retailcrm/mappers";
import { RetailCrmClient } from "@/lib/retailcrm/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";
import type { FullSyncResult, OrderRow } from "@/lib/types";
import { toErrorMessage } from "@/lib/utils";

function buildSchemaGuidance(message: string): Error {
  if (/supabase\/schema\.sql/i.test(message)) {
    return new Error(message);
  }

  return new Error(
    `${message}. Apply the SQL from supabase/schema.sql in Supabase SQL Editor and rerun the sync.`,
  );
}

export async function syncRetailCrmOrdersToSupabase(): Promise<{
  importedCount: number;
  upsertedOrders: OrderRow[];
}> {
  requireServerEnv([
    "RETAILCRM_BASE_URL",
    "RETAILCRM_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);

  const retailCrmClient = new RetailCrmClient();
  const supabase = createSupabaseAdminClient();

  const importedOrders = await retailCrmClient.listAllOrders(100);
  const rows = importedOrders.map(mapRetailCrmOrderToRow);

  if (rows.length === 0) {
    return {
      importedCount: 0,
      upsertedOrders: [],
    };
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .upsert(rows, {
        onConflict: "external_id",
        ignoreDuplicates: false,
      })
      .select(
        "retailcrm_id, external_id, order_number, site, status, order_method, created_at, total_amount, currency, customer_name, customer_phone, customer_email, city, items_count, item_names, synced_at, raw_payload",
      );

    if (error) {
      if (isMissingRelationError(error)) {
        throw buildSchemaGuidance(error.message);
      }

      throw error;
    }

    return {
      importedCount: importedOrders.length,
      upsertedOrders: (data ?? []) as OrderRow[],
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      throw buildSchemaGuidance(toErrorMessage(error));
    }

    throw error;
  }
}

export async function notifyHighValueOrders(
  sourceOrders?: OrderRow[],
): Promise<number> {
  requireServerEnv([
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
  ]);

  const env = readServerEnv();
  const supabase = createSupabaseAdminClient();
  const threshold = env.HIGH_VALUE_THRESHOLD;

  const orders =
    sourceOrders ??
    (await loadOrdersForNotification(supabase));

  const { data: notificationRows, error: notificationsError } = await supabase
    .from("telegram_notifications")
    .select("order_external_id");

  if (notificationsError) {
    if (isMissingRelationError(notificationsError)) {
      throw buildSchemaGuidance(notificationsError.message);
    }

    throw notificationsError;
  }

  const notifiedExternalIds = new Set(
    (notificationRows ?? []).map((row) => row.order_external_id),
  );

  const candidates = pickOrdersForNotification(
    orders as NotifiableOrder[],
    threshold,
    notifiedExternalIds,
  );

  let sentCount = 0;

  for (const order of candidates) {
    const message = buildTelegramMessage(order, threshold);
    const telegramMessageId = await sendTelegramMessage(message);

    const { error } = await supabase.from("telegram_notifications").upsert(
      {
        order_external_id: order.external_id,
        retailcrm_id: order.retailcrm_id,
        total_amount: order.total_amount,
        telegram_chat_id: env.TELEGRAM_CHAT_ID,
        telegram_message_id: telegramMessageId,
        message_text: message,
      },
      {
        onConflict: "order_external_id",
      },
    );

    if (error) {
      throw error;
    }

    sentCount += 1;
  }

  return sentCount;
}

async function loadOrdersForNotification(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
): Promise<NotifiableOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "retailcrm_id, external_id, order_number, total_amount, customer_name, city, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      throw buildSchemaGuidance(error.message);
    }

    throw error;
  }

  return (data ?? []) as NotifiableOrder[];
}

export async function runFullSync(): Promise<FullSyncResult> {
  const env = readServerEnv();
  const supabase = createSupabaseAdminClient();

  try {
    const syncResult = await syncRetailCrmOrdersToSupabase();
    const notifiedCount = await notifyHighValueOrders(syncResult.upsertedOrders);

    await writeSyncRun(supabase, {
      status: "success",
      source: "manual_or_cron",
      imported_count: syncResult.importedCount,
      upserted_count: syncResult.upsertedOrders.length,
      notified_count: notifiedCount,
      error_message: null,
    });

    return {
      importedCount: syncResult.importedCount,
      upsertedCount: syncResult.upsertedOrders.length,
      notifiedCount,
      threshold: env.HIGH_VALUE_THRESHOLD,
    };
  } catch (error) {
    await writeSyncRun(supabase, {
      status: "failed",
      source: "manual_or_cron",
      imported_count: 0,
      upserted_count: 0,
      notified_count: 0,
      error_message: toErrorMessage(error),
    }).catch(() => undefined);

    throw error;
  }
}

async function writeSyncRun(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  payload: {
    status: string;
    source: string;
    imported_count: number;
    upserted_count: number;
    notified_count: number;
    error_message: string | null;
  },
) {
  const { error } = await supabase.from("sync_runs").insert({
    ...payload,
    finished_at: new Date().toISOString(),
  });

  if (error && !isMissingRelationError(error)) {
    throw error;
  }
}

function isMissingRelationError(error: unknown): boolean {
  if (typeof error === "string") {
    return /PGRST205|relation .* does not exist|Could not find the table/i.test(error);
  }

  if (error && typeof error === "object") {
    const candidate = error as Partial<PostgrestError> & { message?: string };
    return (
      candidate.code === "42P01" ||
      candidate.code === "PGRST205" ||
      /relation .* does not exist|Could not find the table/i.test(
        candidate.message ?? "",
      )
    );
  }

  return false;
}
