import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OrdersTable } from "@/components/orders-table";

describe("OrdersTable", () => {
  it("shows a helpful empty state when there are no orders", () => {
    render(<OrdersTable orders={[]} />);

    expect(screen.getByText("Заказов в Supabase пока нет.")).toBeInTheDocument();
    expect(
      screen.getByText(/Сначала выполни импорт в RetailCRM и синхронизацию/i),
    ).toBeInTheDocument();
  });
});
