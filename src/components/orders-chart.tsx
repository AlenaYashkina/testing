"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DailyOrdersPoint } from "@/lib/types";
import { formatCompactCurrency } from "@/lib/utils";

interface OrdersChartProps {
  series: DailyOrdersPoint[];
}

export function OrdersChart({ series }: OrdersChartProps) {
  return (
    <div className="chart-shell">
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart
          data={series}
          margin={{ top: 12, right: 18, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="rgba(11, 18, 33, 0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgba(11, 18, 33, 0.56)", fontSize: 12 }}
          />
          <YAxis
            yAxisId="orders"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgba(11, 18, 33, 0.56)", fontSize: 12 }}
            allowDecimals={false}
            width={48}
          />
          <YAxis
            yAxisId="revenue"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "rgba(11, 18, 33, 0.56)", fontSize: 12 }}
            tickFormatter={(value) => formatCompactCurrency(Number(value))}
            width={82}
          />
          <Tooltip
            cursor={{ stroke: "rgba(15, 118, 110, 0.16)", strokeWidth: 1 }}
            contentStyle={{
              borderRadius: "16px",
              border: "1px solid rgba(11, 18, 33, 0.08)",
              boxShadow: "0 20px 60px rgba(11, 18, 33, 0.12)",
            }}
            formatter={(value: number, name) => {
              if (name === "ordersCount") {
                return [`${value} шт.`, "Заказы"];
              }

              return [formatCompactCurrency(value), "Выручка"];
            }}
            labelFormatter={(label) => `Дата: ${label}`}
          />
          <Bar
            yAxisId="orders"
            dataKey="ordersCount"
            name="ordersCount"
            fill="rgba(15, 118, 110, 0.24)"
            stroke="rgba(15, 118, 110, 0.62)"
            radius={[10, 10, 0, 0]}
            maxBarSize={22}
          />
          <Line
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            name="revenue"
            stroke="#0f766e"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "#0f766e" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
