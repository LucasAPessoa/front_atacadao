import { Tabs } from "../../ui/Tabs";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api";
import type { OrderListParams } from "../../api/types";
import { useUrlState } from "../../ui/useUrlState";
import { ReconciliationQueue } from "./ReconciliationQueue";
import {
  type OrderFilters,
  OrdersListView,
  PAGE_SIZE,
  orderFilterDefaults,
} from "./OrdersListView";
import { ORDER_STATUSES } from "./labels";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (value: string) =>
  DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) ? value : "";

/** Valores inválidos vindos da URL caem no padrão (evita 422). */
export function sanitizeFilters(f: OrderFilters): OrderFilters {
  const status = ORDER_STATUSES.filter((s) => f.status.split(",").includes(s));
  const skip = Number.parseInt(f.skip, 10);
  return {
    ...f,
    status: status.join(","),
    created_from: validDate(f.created_from),
    created_to: validDate(f.created_to),
    skip: Number.isFinite(skip) && skip >= 0 ? String(skip) : orderFilterDefaults.skip,
  };
}

export function toParams(f: OrderFilters): OrderListParams {
  return {
    status: f.status ? f.status.split(",") : undefined,
    created_from: f.created_from || undefined,
    created_to: f.created_to || undefined,
    customer: f.customer.trim() || undefined,
    skip: Number.parseInt(f.skip, 10) || 0,
    limit: PAGE_SIZE,
  };
}

const TABS = [
  ["pedidos", "Pedidos"],
  ["fila", "Fila de conciliação"],
] as const;

export function OrdersList() {
  const [state, update] = useUrlState({ ...orderFilterDefaults, aba: "pedidos" });
  const tab = state.aba === "fila" ? "fila" : "pedidos";
  const filters = sanitizeFilters(state);
  const params = toParams(filters);
  const orders = useQuery({
    queryKey: ["admin", "orders", params],
    queryFn: ({ signal }) => adminApi.orders(params, signal),
    placeholderData: keepPreviousData,
    enabled: tab === "pedidos",
  });

  return (
    <section aria-labelledby="adm-page-title">
      <div className="adm-page-header">
        <h1 id="adm-page-title">Pedidos</h1>
      </div>
      <Tabs
        label="Seções de pedidos"
        tabs={TABS}
        active={tab}
        onSelect={(key) => update({ aba: key })}
      />
      {tab === "fila" ? (
        <ReconciliationQueue />
      ) : (
        <OrdersListView
          filters={filters}
          items={orders.data?.items ?? []}
          total={orders.data?.meta.total ?? 0}
          loading={orders.isFetching}
          error={orders.error}
          onChange={update}
          onClear={() => update({ ...orderFilterDefaults })}
          onRetry={() => void orders.refetch()}
        />
      )}
    </section>
  );
}
