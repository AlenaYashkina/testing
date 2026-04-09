import type { StatusBreakdownItem, SyncRunSummary } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

interface SyncStatusProps {
  latestRun: SyncRunSummary | null;
  statuses: StatusBreakdownItem[];
}

export function SyncStatus({ latestRun, statuses }: SyncStatusProps) {
  return (
    <div className="status-rail">
      <section className="status-block fade-enter">
        <div className="section-kicker">Последний прогон</div>
        {latestRun ? (
          <>
            <div className="status-block__headline">
              <strong>{latestRun.status === "success" ? "Успешно" : "С ошибкой"}</strong>
              <span>{formatDateTime(latestRun.finished_at)}</span>
            </div>
            <dl className="status-metrics">
              <div>
                <dt>Импортировано из CRM</dt>
                <dd>{latestRun.imported_count}</dd>
              </div>
              <div>
                <dt>Записано в Supabase</dt>
                <dd>{latestRun.upserted_count}</dd>
              </div>
              <div>
                <dt>Отправлено в Telegram</dt>
                <dd>{latestRun.notified_count}</dd>
              </div>
            </dl>
            {latestRun.error_message ? (
              <p className="status-error">{latestRun.error_message}</p>
            ) : null}
          </>
        ) : (
          <div className="empty-state empty-state--compact">
            <p>Прогонов еще не было.</p>
            <span>Запусти `npm run sync:all`, чтобы наполнить дашборд и журнал.</span>
          </div>
        )}
      </section>

      <section className="status-block fade-enter" style={{ animationDelay: "120ms" }}>
        <div className="section-kicker">Статусы заказов</div>
        <div className="status-list">
          {statuses.length > 0 ? (
            statuses.map((status) => (
              <div className="status-list__item" key={status.status}>
                <span>{status.label}</span>
                <strong>{status.count}</strong>
              </div>
            ))
          ) : (
            <div className="empty-state empty-state--compact">
              <p>Пока без разбивки.</p>
              <span>Появится после первой синхронизации.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
