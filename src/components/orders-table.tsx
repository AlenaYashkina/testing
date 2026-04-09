import React from "react";

import type { OrderSummary } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface OrdersTableProps {
  orders: OrderSummary[];
}

export function OrdersTable({ orders }: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <p>Заказов в Supabase пока нет.</p>
        <span>Сначала выполни импорт в RetailCRM и синхронизацию в базу.</span>
      </div>
    );
  }

  return (
    <div className="orders-table">
      <div className="orders-table__head">
        <span>Заказ</span>
        <span>Клиент</span>
        <span>Сумма</span>
        <span>Статус</span>
      </div>
      <div className="orders-table__body">
        {orders.map((order, index) => (
          <article
            className="orders-table__row fade-enter"
            style={{ animationDelay: `${index * 60}ms` }}
            key={order.external_id}
          >
            <div>
              <strong>{order.order_number}</strong>
              <span>{formatDateTime(order.created_at)}</span>
            </div>
            <div>
              <strong>{order.customer_name}</strong>
              <span>{order.city ?? "Город не указан"}</span>
            </div>
            <div>
              <strong>{formatCurrency(order.total_amount)}</strong>
              <span>{order.items_count} позиций</span>
            </div>
            <div>
              <strong>{order.status ?? "Без статуса"}</strong>
              <span>{order.order_method ?? "Метод не указан"}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
