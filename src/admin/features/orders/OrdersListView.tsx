import { Link } from "react-router";
import type { AdminOrderSummary } from "../../api/types";
import { DataTable } from "../../ui/DataTable";
import type { Column } from "../../ui/DataTable";
import { EmptyState } from "../../ui/EmptyState";
import { ErrorState } from "../../ui/ErrorState";
import { FilterBar } from "../../ui/FilterBar";
import { Pagination } from "../../ui/Pagination";
import { SearchInput } from "../../ui/SearchInput";
import { formatBRL } from "../products/format";
import { ORDER_STATUSES, formatDateTime, statusLabel, statusTone } from "./labels";

export const PAGE_SIZE = 25;

export const orderFilterDefaults = {
  status: "",
  created_from: "",
  created_to: "",
  customer: "",
  skip: "0",
};
export type OrderFilters = typeof orderFilterDefaults;

const columns: Column<AdminOrderSummary>[] = [
  {
    key: "code",
    header: "Código",
    render: (o) => <Link to={`/pedidos/${o.id}`}>{o.order_code}</Link>,
  },
  { key: "date", header: "Data", render: (o) => formatDateTime(o.created_at) },
  {
    key: "customer",
    header: "Cliente",
    render: (o) => (
      <>
        {o.customer.full_name}
        <div className="adm-muted">{o.customer.email}</div>
      </>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (o) => (
      <span className="adm-badge" data-tone={statusTone(o.status)}>
        {statusLabel(o.status)}
      </span>
    ),
  },
  { key: "items", header: "Itens", align: "right", render: (o) => o.items_count },
  { key: "total", header: "Total", align: "right", render: (o) => formatBRL(o.total_amount) },
];

export type OrdersListViewProps = {
  filters: OrderFilters;
  items: AdminOrderSummary[];
  total: number;
  loading: boolean;
  error: unknown;
  onChange(patch: Partial<OrderFilters>): void;
  onClear(): void;
  onRetry(): void;
};

export function OrdersListView(p: OrdersListViewProps) {
  const { filters } = p;
  const skip = Number.parseInt(filters.skip, 10) || 0;
  const selected = filters.status ? filters.status.split(",") : [];
  const dirty = (Object.keys(orderFilterDefaults) as (keyof OrderFilters)[]).some(
    (key) => filters[key] !== orderFilterDefaults[key],
  );
  const toggle = (status: string) => {
    const next = selected.includes(status)
      ? selected.filter((s) => s !== status)
      : ORDER_STATUSES.filter((s) => s === status || selected.includes(s));
    p.onChange({ status: next.join(",") });
  };

  return (
    <>
      <FilterBar onClear={p.onClear} canClear={dirty}>
        <SearchInput
          value={filters.customer}
          onChange={(customer) => p.onChange({ customer })}
          label="Buscar cliente"
          placeholder="Nome ou e-mail"
        />
        <div className="adm-field">
          <label htmlFor="flt-from">De</label>
          <input
            id="flt-from"
            type="date"
            value={filters.created_from}
            onChange={(e) => p.onChange({ created_from: e.target.value })}
          />
        </div>
        <div className="adm-field">
          <label htmlFor="flt-to">Até</label>
          <input
            id="flt-to"
            type="date"
            value={filters.created_to}
            onChange={(e) => p.onChange({ created_to: e.target.value })}
          />
        </div>
        <fieldset className="adm-field">
          <legend>Status</legend>
          {ORDER_STATUSES.map((status) => (
            <label key={status} style={{ marginRight: "0.75rem" }}>
              <input
                type="checkbox"
                name="status"
                value={status}
                checked={selected.includes(status)}
                onChange={() => toggle(status)}
              />{" "}
              {statusLabel(status)}
            </label>
          ))}
        </fieldset>
      </FilterBar>
      {p.error && p.items.length === 0 ? (
        <ErrorState error={p.error} onRetry={p.onRetry} />
      ) : (
        <>
          <DataTable
            caption="Pedidos"
            columns={columns}
            rows={p.items}
            rowKey={(row) => row.id}
            loading={p.loading}
            empty={
              <EmptyState
                title="Nenhum pedido encontrado"
                action={
                  dirty ? (
                    <button type="button" className="adm-btn" onClick={p.onClear}>
                      Limpar filtros
                    </button>
                  ) : undefined
                }
              >
                {dirty
                  ? "Nenhum pedido corresponde aos filtros aplicados."
                  : "Ainda não há pedidos."}
              </EmptyState>
            }
          />
          {p.items.length > 0 && (
            <Pagination
              total={p.total}
              skip={skip}
              limit={PAGE_SIZE}
              disabled={p.loading}
              onChange={(next) => p.onChange({ skip: String(next) })}
            />
          )}
        </>
      )}
    </>
  );
}
