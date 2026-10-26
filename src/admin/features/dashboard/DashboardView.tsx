import { Link } from "react-router";
import type { DashboardSummary } from "../../api/types";
import { EmptyState } from "../../ui/EmptyState";
import { ErrorState } from "../../ui/ErrorState";
import { SkeletonRows } from "../../ui/Skeleton";
import { ORDER_STATUSES, statusLabel } from "../orders/labels";
import { formatBRL } from "../products/format";
import { PERIODS, type PeriodKey } from "./period";

export type DashboardFilters = { periodo: PeriodKey; de: string; ate: string };

export type DashboardViewProps = {
  filters: DashboardFilters;
  periodError: string;
  summary: DashboardSummary | undefined;
  loading: boolean;
  error: unknown;
  onChange(patch: Partial<DashboardFilters>): void;
  onRetry(): void;
};

const formatDay = (value: string) => value.split("-").reverse().join("/");

function StatusBars({ counts }: { counts: Record<string, number> }) {
  const known: string[] = [...ORDER_STATUSES];
  const keys = [...known, ...Object.keys(counts).filter((key) => !known.includes(key))];
  const max = Math.max(1, ...keys.map((key) => counts[key] ?? 0));
  return (
    <ul className="adm-bars" aria-label="Pedidos por status">
      {keys.map((key) => {
        const value = counts[key] ?? 0;
        return (
          <li key={key} className="adm-bar-row">
            <span className="adm-bar-label">{statusLabel(key)}</span>
            <svg
              className="adm-bar-track"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect className="adm-bar-fill" x="0" y="0" width={(value / max) * 100} height="10" />
            </svg>
            <span className="adm-bar-value">{value}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function DashboardView(p: DashboardViewProps) {
  const { filters, summary } = p;
  return (
    <section aria-labelledby="adm-page-title">
      <div className="adm-page-header">
        <h1 id="adm-page-title">Dashboard</h1>
      </div>
      <search className="adm-filterbar">
        <div className="adm-field">
          <label htmlFor="dash-period">Período</label>
          <select
            id="dash-period"
            value={filters.periodo}
            onChange={(e) => p.onChange({ periodo: e.target.value as PeriodKey })}
          >
            {PERIODS.map(([key, text]) => (
              <option key={key} value={key}>
                {text}
              </option>
            ))}
          </select>
        </div>
        {filters.periodo === "custom" && (
          <>
            <div className="adm-field">
              <label htmlFor="dash-from">De</label>
              <input
                id="dash-from"
                type="date"
                value={filters.de}
                onChange={(e) => p.onChange({ de: e.target.value })}
              />
            </div>
            <div className="adm-field">
              <label htmlFor="dash-to">Até</label>
              <input
                id="dash-to"
                type="date"
                value={filters.ate}
                onChange={(e) => p.onChange({ ate: e.target.value })}
              />
            </div>
          </>
        )}
      </search>
      {p.periodError ? (
        <p className="adm-alert adm-alert-danger" role="alert">
          {p.periodError}
        </p>
      ) : p.error && !summary ? (
        <ErrorState error={p.error} onRetry={p.onRetry} />
      ) : !summary ? (
        <SkeletonRows rows={4} />
      ) : (
        <>
          <p className="adm-muted" aria-busy={p.loading}>
            Período de {formatDay(summary.from)} a {formatDay(summary.to)} ({summary.timezone})
          </p>
          <div className="adm-kpis">
            <div className="adm-card">
              <h2 className="adm-kpi-title">Faturamento</h2>
              <p className="adm-kpi-value">{formatBRL(summary.revenue)}</p>
            </div>
            <div className="adm-card">
              <h2 className="adm-kpi-title">Pedidos pagos</h2>
              <p className="adm-kpi-value">{summary.paid_orders}</p>
            </div>
            <div className="adm-card">
              <h2 className="adm-kpi-title">Ticket médio</h2>
              <p className="adm-kpi-value">{formatBRL(summary.average_ticket)}</p>
            </div>
            <div className="adm-card">
              <h2 className="adm-kpi-title">Estoque baixo</h2>
              <p className="adm-kpi-value">{summary.low_stock_products}</p>
              <p className="adm-muted">
                Produtos com {summary.low_stock_threshold} ou menos unidades
              </p>
              <Link to="/produtos?low_stock=true">Ver produtos com estoque baixo</Link>
            </div>
            <div className="adm-card">
              <h2 className="adm-kpi-title">Produtos com pendência</h2>
              <p className="adm-kpi-value">{summary.bling_pending_products}</p>
              <p className="adm-muted">Cadastro incompleto vindo do Bling</p>
              <Link to="/bling">Ver pendências do Bling</Link>
            </div>
          </div>
          <div className="adm-card">
            <h2>Pedidos por status</h2>
            {Object.values(summary.orders_by_status).every((n) => n === 0) && (
              <EmptyState title="Nenhum pedido no período" />
            )}
            <StatusBars counts={summary.orders_by_status} />
          </div>
        </>
      )}
    </section>
  );
}
