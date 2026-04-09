import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildCustomerDigests,
  buildDailySeries,
  buildDashboardKpis,
  buildStatusBreakdown,
} from "@/lib/orders/aggregations";
import type { OrderSummary } from "@/lib/types";

const orders: OrderSummary[] = [
  {
    retailcrm_id: 1,
    external_id: "demo-order-001",
    order_number: "TST-1001",
    status: "new",
    order_method: "api",
    created_at: "2026-04-07T10:00:00.000Z",
    total_amount: 42000,
    currency: "KZT",
    customer_name: "Aidana Serikova",
    customer_phone: null,
    customer_email: null,
    city: "Almaty",
    items_count: 1,
    item_names: ["Keyboard Flow"],
    synced_at: "2026-04-07T10:15:00.000Z",
  },
  {
    retailcrm_id: 2,
    external_id: "demo-order-002",
    order_number: "TST-1002",
    status: "complete",
    order_method: "api",
    created_at: "2026-04-08T10:00:00.000Z",
    total_amount: 99000,
    currency: "KZT",
    customer_name: "Timur Omarov",
    customer_phone: null,
    customer_email: null,
    city: "Astana",
    items_count: 2,
    item_names: ["Smart Watch Move"],
    synced_at: "2026-04-08T10:15:00.000Z",
  },
  {
    retailcrm_id: 3,
    external_id: "demo-order-003",
    order_number: "TST-1003",
    status: "complete",
    order_method: "api",
    created_at: "2026-04-09T10:00:00.000Z",
    total_amount: 210000,
    currency: "KZT",
    customer_name: "Diana Toktarova",
    customer_phone: null,
    customer_email: null,
    city: "Shymkent",
    items_count: 1,
    item_names: ["Monitor Vision 27"],
    synced_at: "2026-04-09T10:15:00.000Z",
  },
];

describe("Order aggregations", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-09T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds dashboard KPIs from imported orders", () => {
    const kpis = buildDashboardKpis(orders, 50000);

    expect(kpis.totalOrders).toBe(3);
    expect(kpis.totalRevenue).toBe(351000);
    expect(kpis.averageCheck).toBe(117000);
    expect(kpis.highValueOrders).toBe(2);
  });

  it("fills the last N days chart with zero-value dates", () => {
    const series = buildDailySeries(orders, 3);

    expect(series).toHaveLength(3);
    expect(series[0].ordersCount + series[1].ordersCount + series[2].ordersCount).toBe(3);
    expect(series[2].revenue).toBe(210000);
  });

  it("groups orders by status for the side rail", () => {
    const statuses = buildStatusBreakdown(orders);

    expect(statuses[0]).toEqual({
      status: "complete",
      label: "Complete",
      count: 2,
    });
  });

  it("builds a recent customers digest for the dashboard rail", () => {
    const digest = buildCustomerDigests([
      ...orders,
      {
        ...orders[1],
        retailcrm_id: 4,
        external_id: "demo-order-004",
        order_number: "TST-1004",
        created_at: "2026-04-09T11:00:00.000Z",
        total_amount: 45000,
      },
    ]);

    expect(digest[0]).toEqual(
      expect.objectContaining({
        customer_name: "Timur Omarov",
        orders_count: 2,
        total_amount: 144000,
        last_order_number: "TST-1004",
      }),
    );
  });
});
