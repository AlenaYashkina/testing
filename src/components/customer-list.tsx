import type { CustomerDigest } from "@/lib/types";
import { formatCompactCurrency, formatDateTime } from "@/lib/utils";

interface CustomerListProps {
  customers: CustomerDigest[];
}

export function CustomerList({ customers }: CustomerListProps) {
  return (
    <section className="status-block fade-enter" style={{ animationDelay: "240ms" }}>
      <div className="section-kicker">Клиенты</div>
      {customers.length > 0 ? (
        <div className="customer-list">
          {customers.map((customer) => (
            <article className="customer-card" key={customer.key}>
              <div className="customer-card__top">
                <div>
                  <strong>{customer.customer_name}</strong>
                  <span>{customer.city ?? "Город не указан"}</span>
                </div>
                <strong>{formatCompactCurrency(customer.total_amount)}</strong>
              </div>
              <div className="customer-card__meta">
                <span>{customer.customer_phone ?? customer.customer_email ?? "Контакт не указан"}</span>
                <span>
                  Последний заказ {customer.last_order_number} от {formatDateTime(customer.last_order_at)}
                </span>
              </div>
              <div className="customer-card__stats">
                <span>{customer.orders_count} заказов</span>
                <span>Повторные клиенты под рукой</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state empty-state--compact">
          <p>Клиенты пока не загружены.</p>
          <span>После первой синхронизации здесь появится краткая клиентская сводка.</span>
        </div>
      )}
    </section>
  );
}
