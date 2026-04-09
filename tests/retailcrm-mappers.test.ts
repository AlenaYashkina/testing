import sourceMockOrders from "../mock_orders.json";
import { describe, expect, it } from "vitest";

import { prepareMockOrders } from "@/lib/mock-orders";
import {
  buildRetailCrmCreateOrderPayload,
  mapRetailCrmOrderToRow,
} from "@/lib/retailcrm/mappers";
import { sourceMockOrdersSchema } from "@/lib/types";

describe("RetailCRM mappers", () => {
  const [firstSourceOrder] = sourceMockOrdersSchema.parse(sourceMockOrders);
  const [firstPreparedOrder] = prepareMockOrders([firstSourceOrder]);

  it("builds a stable create payload from the task mock order file", () => {
    const payload = buildRetailCrmCreateOrderPayload(firstPreparedOrder);

    expect(payload).toMatchObject({
      externalId: "demo-order-001",
      number: "MOCK-1001",
      firstName: firstSourceOrder.firstName,
      lastName: firstSourceOrder.lastName,
      phone: firstSourceOrder.phone,
      orderType: firstSourceOrder.orderType,
      orderMethod: firstSourceOrder.orderMethod,
      status: firstSourceOrder.status,
      countryIso: "KZ",
    });

    expect(payload.items).toHaveLength(firstSourceOrder.items.length);
  });

  it("can omit account-specific RetailCRM codes when CRM does not support them", () => {
    const payload = buildRetailCrmCreateOrderPayload(firstPreparedOrder, {
      includeOrderType: false,
      includeOrderMethod: false,
      includeStatus: false,
      includeCustomFields: false,
    });

    expect(payload).not.toHaveProperty("orderType");
    expect(payload).not.toHaveProperty("orderMethod");
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("customFields");
    expect(payload.customerComment).toBeDefined();
  });

  it("normalizes RetailCRM API order into Supabase row shape", () => {
    const row = mapRetailCrmOrderToRow({
      id: 901,
      externalId: "demo-order-901",
      number: "MOCK-1901",
      createdAt: "2026-04-09T08:00:00.000Z",
      status: "new",
      orderMethod: "shopping-cart",
      firstName: "Aruzhan",
      lastName: "Musina",
      phone: "+77075555555",
      email: "aruzhan@example.com",
      currency: "KZT",
      totalSumm: "68000",
      city: "Almaty",
      items: [
        {
          productName: "Smart Watch Move",
          quantity: 1,
        },
        {
          offer: {
            name: "Gift box",
          },
          quantity: 2,
        },
      ],
    });

    expect(row).toEqual(
      expect.objectContaining({
        retailcrm_id: 901,
        external_id: "demo-order-901",
        order_number: "MOCK-1901",
        total_amount: 68000,
        customer_name: "Aruzhan Musina",
        city: "Almaty",
        items_count: 3,
      }),
    );

    expect(row.item_names).toEqual(["Smart Watch Move", "Gift box"]);
  });
});
