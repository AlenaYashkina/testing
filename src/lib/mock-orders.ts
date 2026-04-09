import fs from "node:fs/promises";
import path from "node:path";

import { addDays, addHours, addMinutes, formatISO } from "date-fns";

import {
  sourceMockOrdersSchema,
  type PreparedMockOrder,
  type SourceMockOrder,
} from "@/lib/types";

const MOCK_ORDER_BASE_DATE = new Date("2026-03-11T09:00:00+05:00");
const MOCK_ORDER_DAILY_COUNTS = [
  1, 2, 1, 3, 2, 1, 0, 2, 3, 1,
  2, 1, 2, 0, 3, 2, 1, 2, 3, 1,
  2, 1, 2, 3, 1, 1, 2, 2, 2, 1,
] as const;
const MOCK_ORDER_HOUR_OFFSETS = [0, 2, 6] as const;

export async function readSourceMockOrders(
  filePath = path.join(process.cwd(), "mock_orders.json"),
): Promise<SourceMockOrder[]> {
  const rawFile = await fs.readFile(filePath, "utf8");
  return sourceMockOrdersSchema.parse(JSON.parse(rawFile));
}

export function prepareMockOrders(
  sourceOrders: SourceMockOrder[],
): PreparedMockOrder[] {
  const createdTimeline = buildMockOrderTimeline(sourceOrders.length);

  return sourceOrders.map((order, index) => ({
    externalId: `demo-order-${String(index + 1).padStart(3, "0")}`,
    number: `MOCK-${String(1001 + index)}`,
    createdAt: createdTimeline[index],
    totalAmount: order.items.reduce(
      (sum, item) => sum + item.initialPrice * item.quantity,
      0,
    ),
    source: order,
  }));
}

function buildMockOrderTimeline(totalOrders: number): string[] {
  const timeline: string[] = [];

  for (const [dayOffset, dailyCount] of MOCK_ORDER_DAILY_COUNTS.entries()) {
    for (let orderIndex = 0; orderIndex < dailyCount; orderIndex += 1) {
      const scheduledAt = addMinutes(
        addHours(
          addDays(MOCK_ORDER_BASE_DATE, dayOffset),
          MOCK_ORDER_HOUR_OFFSETS[orderIndex] ?? orderIndex * 2,
        ),
        dayOffset * 7,
      );

      timeline.push(formatISO(scheduledAt));

      if (timeline.length === totalOrders) {
        return timeline;
      }
    }
  }

  throw new Error(
    `Mock order timeline is too short: expected ${totalOrders} timestamps, got ${timeline.length}.`,
  );
}
