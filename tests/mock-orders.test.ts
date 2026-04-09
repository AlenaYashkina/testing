import { describe, expect, it } from "vitest";

import { prepareMockOrders, readSourceMockOrders } from "@/lib/mock-orders";

describe("prepareMockOrders", () => {
  it("creates a varied timeline instead of one order on every single day", async () => {
    const sourceOrders = await readSourceMockOrders();
    const preparedOrders = prepareMockOrders(sourceOrders);
    const countsByDate = new Map<string, number>();

    for (const order of preparedOrders) {
      const dateKey = order.createdAt.slice(0, 10);
      countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
    }

    const dailyCounts = Array.from(countsByDate.values());

    expect(preparedOrders).toHaveLength(50);
    expect(countsByDate.size).toBeLessThan(preparedOrders.length);
    expect(new Set(dailyCounts).size).toBeGreaterThan(1);
    expect(Math.max(...dailyCounts)).toBeGreaterThan(1);
  });
});
