import type { PostgrestError } from "@supabase/supabase-js";

import { readServerEnv } from "@/lib/env";
import { mapRetailCrmOrderToRow } from "@/lib/retailcrm/mappers";
import { RetailCrmClient } from "@/lib/retailcrm/client";
import { createSupabaseReadClient } from "@/lib/supabase/admin";
import type { DashboardSnapshot, OrderSummary, SyncRunSummary } from "@/lib/types";

import {
  buildCustomerDigests,
  buildDailySeries,
  buildDashboardKpis,
  buildStatusBreakdown,
} from "./aggregations";

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const env = readServerEnv();

  if (!env.SUPABASE_URL || (!env.SUPABASE_ANON_KEY && !env.SUPABASE_SERVICE_ROLE_KEY)) {
    return buildEmptySetupSnapshot(
      "Dashboard is waiting for SUPABASE_URL and a valid API key in the environment.",
      env.HIGH_VALUE_THRESHOLD,
    );
  }

  try {
    const supabase = createSupabaseReadClient();
    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        "retailcrm_id, external_id, order_number, status, order_method, created_at, total_amount, currency, customer_name, customer_phone, customer_email, city, items_count, item_names, synced_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      if (isMissingRelationError(error)) {
        return buildPreviewSetupSnapshot(
          "Supabase schema is not applied yet. Run supabase/schema.sql in the SQL Editor first.",
          env.HIGH_VALUE_THRESHOLD,
        );
      }

      throw error;
    }

    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true });

    const { data: latestRun, error: latestRunError } = await supabase
      .from("sync_runs")
      .select(
        "status, source, imported_count, upserted_count, notified_count, created_at, finished_at, error_message",
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRunError && !isMissingRelationError(latestRunError)) {
      throw latestRunError;
    }

    const normalizedOrders = (orders ?? []) as OrderSummary[];
    const kpis = buildDashboardKpis(normalizedOrders, env.HIGH_VALUE_THRESHOLD);

    return {
      setupRequired: false,
      kpis: {
        ...kpis,
        totalOrders: count ?? kpis.totalOrders,
      },
      dailySeries: buildDailySeries(normalizedOrders, 30),
      latestOrders: normalizedOrders.slice(0, 8),
      recentCustomers: buildCustomerDigests(normalizedOrders),
      statusBreakdown: buildStatusBreakdown(normalizedOrders),
      latestRun: (latestRun ?? null) as SyncRunSummary | null,
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return buildPreviewSetupSnapshot(
        "Supabase schema is not applied yet. Run supabase/schema.sql in the SQL Editor first.",
        env.HIGH_VALUE_THRESHOLD,
      );
    }

    throw error;
  }
}

async function buildPreviewSetupSnapshot(
  setupMessage: string,
  threshold: number,
): Promise<DashboardSnapshot> {
  const previewOrders = await loadRetailCrmPreviewOrders();

  return {
    setupRequired: true,
    setupMessage,
    kpis: buildDashboardKpis(previewOrders, threshold),
    dailySeries: buildDailySeries(previewOrders, 30),
    latestOrders: previewOrders.slice(0, 8),
    recentCustomers: buildCustomerDigests(previewOrders),
    statusBreakdown: buildStatusBreakdown(previewOrders),
    latestRun: null,
  };
}

function buildEmptySetupSnapshot(
  setupMessage: string,
  threshold: number,
): DashboardSnapshot {
  return {
    setupRequired: true,
    setupMessage,
    kpis: {
      totalOrders: 0,
      totalRevenue: 0,
      averageCheck: 0,
      highValueOrders: 0,
      last7DaysOrders: 0,
      last7DaysRevenue: 0,
    },
    dailySeries: buildDailySeries([], 30),
    latestOrders: [],
    recentCustomers: [],
    statusBreakdown: [],
    latestRun: null,
  };
}

async function loadRetailCrmPreviewOrders(): Promise<OrderSummary[]> {
  try {
    const retailCrmClient = new RetailCrmClient();
    const orders = await retailCrmClient.listAllOrders(100);

    return orders.map((order) => mapRetailCrmOrderToRow(order)) as OrderSummary[];
  } catch {
    return [];
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
