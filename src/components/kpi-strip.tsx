import type { DashboardKpis } from "@/lib/types";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";

interface KpiStripProps {
  kpis: DashboardKpis;
}

const kpiItems = [
  {
    label: "Всего заказов",
    value: (kpis: DashboardKpis) => kpis.totalOrders.toLocaleString("ru-RU"),
    note: (_kpis: DashboardKpis) => "Суммарно в Supabase",
  },
  {
    label: "Выручка",
    value: (kpis: DashboardKpis) => formatCompactCurrency(kpis.totalRevenue),
    note: (_kpis: DashboardKpis) => "Все импортированные заказы",
  },
  {
    label: "Средний чек",
    value: (kpis: DashboardKpis) => formatCurrency(kpis.averageCheck),
    note: (_kpis: DashboardKpis) => "Среднее по всем заказам",
  },
  {
    label: "Заказы 50 000+",
    value: (kpis: DashboardKpis) => kpis.highValueOrders.toLocaleString("ru-RU"),
    note: (_kpis: DashboardKpis) => "Триггер для Telegram",
  },
  {
    label: "7 дней",
    value: (kpis: DashboardKpis) => kpis.last7DaysOrders.toLocaleString("ru-RU"),
    note: (kpis: DashboardKpis) =>
      `${formatCompactCurrency(kpis.last7DaysRevenue)} за последнюю неделю`,
  },
];

export function KpiStrip({ kpis }: KpiStripProps) {
  return (
    <section className="kpi-strip fade-enter">
      {kpiItems.map((item, index) => (
        <article
          className="kpi-strip__item"
          style={{ animationDelay: `${index * 80}ms` }}
          key={item.label}
        >
          <span className="kpi-strip__label">{item.label}</span>
          <strong className="kpi-strip__value">{item.value(kpis)}</strong>
          <span className="kpi-strip__note">{item.note(kpis)}</span>
        </article>
      ))}
    </section>
  );
}
