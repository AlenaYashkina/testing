import { format, isAfter, startOfDay, subDays } from "date-fns";

import type {
  CustomerDigest,
  DailyOrdersPoint,
  DashboardKpis,
  OrderSummary,
  StatusBreakdownItem,
} from "@/lib/types";
import { slugToLabel } from "@/lib/utils";

export function buildDailySeries(
  orders: OrderSummary[],
  days = 30,
): DailyOrdersPoint[] {
  const today = startOfDay(new Date());
  const from = subDays(today, days - 1);
  const seriesMap = new Map<string, DailyOrdersPoint>();

  for (let offset = 0; offset < days; offset += 1) {
    const date = subDays(today, days - offset - 1);
    const isoDate = format(date, "yyyy-MM-dd");
    seriesMap.set(isoDate, {
      isoDate,
      label: format(date, "dd MMM"),
      ordersCount: 0,
      revenue: 0,
    });
  }

  for (const order of orders) {
    const orderDate = startOfDay(new Date(order.created_at));
    if (!isAfter(orderDate, today) && !isAfter(from, orderDate)) {
      const isoDate = format(orderDate, "yyyy-MM-dd");
      const point = seriesMap.get(isoDate);

      if (point) {
        point.ordersCount += 1;
        point.revenue += order.total_amount;
      }
    }
  }

  return Array.from(seriesMap.values());
}

export function buildDashboardKpis(
  orders: OrderSummary[],
  threshold: number,
): DashboardKpis {
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
  const averageCheck = totalOrders === 0 ? 0 : totalRevenue / totalOrders;
  const highValueOrders = orders.filter(
    (order) => order.total_amount >= threshold,
  ).length;

  const sevenDaysAgo = subDays(startOfDay(new Date()), 6);
  const last7DaysOrders = orders.filter((order) =>
    !isAfter(sevenDaysAgo, startOfDay(new Date(order.created_at))),
  );

  return {
    totalOrders,
    totalRevenue,
    averageCheck,
    highValueOrders,
    last7DaysOrders: last7DaysOrders.length,
    last7DaysRevenue: last7DaysOrders.reduce(
      (sum, order) => sum + order.total_amount,
      0,
    ),
  };
}

export function buildStatusBreakdown(
  orders: OrderSummary[],
): StatusBreakdownItem[] {
  const counts = new Map<string, number>();

  for (const order of orders) {
    const status = order.status ?? "without_status";
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([status, count]) => ({
      status,
      label: slugToLabel(status),
      count,
    }))
    .sort((left, right) => right.count - left.count);
}

export function buildCustomerDigests(
  orders: OrderSummary[],
  limit = 6,
): CustomerDigest[] {
  const customers = new Map<string, CustomerDigest>();

  for (const order of orders) {
    const key = buildCustomerKey(order);
    const existingCustomer = customers.get(key);

    if (!existingCustomer) {
      customers.set(key, {
        key,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_email: order.customer_email,
        city: order.city,
        orders_count: 1,
        total_amount: order.total_amount,
        last_order_at: order.created_at,
        last_order_number: order.order_number,
      });
      continue;
    }

    existingCustomer.orders_count += 1;
    existingCustomer.total_amount += order.total_amount;

    if (new Date(order.created_at) >= new Date(existingCustomer.last_order_at)) {
      existingCustomer.last_order_at = order.created_at;
      existingCustomer.last_order_number = order.order_number;
      existingCustomer.city = order.city;
      existingCustomer.customer_phone = order.customer_phone;
      existingCustomer.customer_email = order.customer_email;
      existingCustomer.customer_name = order.customer_name;
    }
  }

  return Array.from(customers.values())
    .sort(
      (left, right) =>
        new Date(right.last_order_at).getTime() - new Date(left.last_order_at).getTime(),
    )
    .slice(0, limit);
}

function buildCustomerKey(order: OrderSummary): string {
  const email = order.customer_email?.trim().toLowerCase();
  if (email) {
    return `email:${email}`;
  }

  const phone = order.customer_phone?.trim();
  if (phone) {
    return `phone:${phone}`;
  }

  const normalizedName = order.customer_name.trim().toLowerCase();
  if (normalizedName) {
    return `name:${normalizedName}`;
  }

  return `external:${order.external_id}`;
}
