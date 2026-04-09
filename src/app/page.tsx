import { CustomerList } from "@/components/customer-list";
import { KpiStrip } from "@/components/kpi-strip";
import { OrdersChart } from "@/components/orders-chart";
import { OrdersTable } from "@/components/orders-table";
import { SyncStatus } from "@/components/sync-status";
import { readServerEnv } from "@/lib/env";
import { getDashboardSnapshot } from "@/lib/orders/service";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const snapshot = await getDashboardSnapshot();
  const env = readServerEnv();
  const showPreview = snapshot.setupRequired && snapshot.latestOrders.length > 0;

  return (
    <main className="dashboard-root">
      <div className="dashboard-glow dashboard-glow--top" />
      <div className="dashboard-glow dashboard-glow--bottom" />

      <section className="dashboard-shell">
        <header className="dashboard-header fade-enter">
          <div>
            <span className="dashboard-header__eyebrow">Orders command center</span>
            <h1>Контроль заказов RetailCRM без ручной рутины.</h1>
          </div>
          <div className="dashboard-header__meta">
            <span>Supabase as source of truth</span>
            <span>Telegram alert: {formatCurrency(env.HIGH_VALUE_THRESHOLD)}</span>
          </div>
        </header>

        {snapshot.setupRequired ? (
          <>
            <section className="setup-panel fade-enter" style={{ animationDelay: "120ms" }}>
              <div className="section-kicker">Требуется первый запуск</div>
              <h2>Инфраструктура подключена, но таблицы еще не подготовлены.</h2>
              <p>{snapshot.setupMessage}</p>
              <div className="setup-panel__steps">
                <div>
                  <span>1</span>
                  <p>Примени SQL из `supabase/schema.sql` в SQL Editor проекта.</p>
                </div>
                <div>
                  <span>2</span>
                  <p>Выполни `npm run import:mock-orders`, затем `npm run sync:all`.</p>
                </div>
                <div>
                  <span>3</span>
                  <p>После этого обнови страницу, график и журнал начнут заполняться.</p>
                </div>
              </div>
            </section>

            {showPreview ? (
              <section className="preview-note fade-enter" style={{ animationDelay: "180ms" }}>
                <strong>Preview из RetailCRM уже доступен.</strong>
                <span>
                  Пока таблицы в Supabase не созданы, ниже показывается оперативный
                  срез заказов напрямую из CRM.
                </span>
              </section>
            ) : null}
          </>
        ) : null}

        {!snapshot.setupRequired || showPreview ? (
          <>
            <KpiStrip kpis={snapshot.kpis} />
            <section className="workspace-grid">
              <article className="workspace-panel workspace-panel--chart fade-enter">
                <div className="panel-header">
                  <div>
                    <span className="section-kicker">Динамика за 30 дней</span>
                    <h2>Как меняются заказы и выручка по дням</h2>
                  </div>
                  <p>
                    {snapshot.setupRequired
                      ? "Пока это preview из RetailCRM. После первого sync источник переключится на Supabase."
                      : "График строится по данным из Supabase: столбцы показывают количество заказов, линия показывает выручку."}
                  </p>
                </div>
                <OrdersChart series={snapshot.dailySeries} />
              </article>

              <SyncStatus
                latestRun={snapshot.latestRun}
                statuses={snapshot.statusBreakdown}
              />
              <CustomerList customers={snapshot.recentCustomers} />
            </section>

            <section className="workspace-panel workspace-panel--table fade-enter">
              <div className="panel-header">
                <div>
                  <span className="section-kicker">Последние заказы</span>
                  <h2>Лента заказов для быстрой проверки данных и уведомлений</h2>
                </div>
                <p>
                  {snapshot.latestRun
                    ? `Последняя синхронизация завершилась ${formatDateTime(snapshot.latestRun.finished_at)}.`
                    : "После первого прогона здесь появятся заказы из CRM."}
                </p>
              </div>
              <OrdersTable orders={snapshot.latestOrders} />
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
