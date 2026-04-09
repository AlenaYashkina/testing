import { describe, expect, it } from "vitest";

import {
  buildTelegramMessage,
  pickOrdersForNotification,
  type NotifiableOrder,
} from "@/lib/notifications";

const sampleOrders: NotifiableOrder[] = [
  {
    retailcrm_id: 1,
    external_id: "demo-order-001",
    order_number: "TST-1001",
    total_amount: 42000,
    customer_name: "Aidana Serikova",
    city: "Almaty",
    created_at: "2026-04-09T09:00:00.000Z",
  },
  {
    retailcrm_id: 2,
    external_id: "demo-order-002",
    order_number: "TST-1002",
    total_amount: 88000,
    customer_name: "Timur Omarov",
    city: "Astana",
    created_at: "2026-04-09T10:00:00.000Z",
  },
];

describe("Telegram notifications", () => {
  it("selects only orders above the threshold and not previously notified", () => {
    const result = pickOrdersForNotification(
      sampleOrders,
      50000,
      new Set(["demo-order-999"]),
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.external_id).toBe("demo-order-002");
  });

  it("builds a readable Telegram message", () => {
    const message = buildTelegramMessage(sampleOrders[1], 50000);

    expect(message).toContain("High-value order detected");
    expect(message).toContain("TST-1002");
    expect(message).toContain("Timur Omarov");
    expect(message).toContain("Threshold");
  });
});
