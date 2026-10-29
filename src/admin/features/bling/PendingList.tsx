import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { adminApi } from "../../api";
import type { BlingPendingItem, PendingReason } from "../../api/types";
import { DataTable } from "../../ui/DataTable";
import type { Column } from "../../ui/DataTable";
import { EmptyState } from "../../ui/EmptyState";
import { ErrorState } from "../../ui/ErrorState";
import { Pagination } from "../../ui/Pagination";
import { pendingLabels } from "../products/format";

export const PAGE_SIZE = 20;
export const PENDING_NOTE = "Pode incluir variação inativa no Bling com cadastro incompleto.";

const reasons = Object.keys(pendingLabels) as PendingReason[];
export const toReason = (value: string): PendingReason | "" =>
  reasons.find((r) => r === value) ?? "";

const columns: Column<BlingPendingItem>[] = [
  {
    key: "product",
    header: "Produto",
    card: "title",
    render: (i) => <Link to={`/produtos/${i.product_id}`}>{i.product_name}</Link>,
  },
  { key: "sku", header: "SKU", card: "field", render: (i) => i.bling_sku ?? "—" },
  {
    key: "reason",
    header: "Motivo",
    card: "field",
    render: (i) => (
      <span className="adm-badge" data-tone="warning">
        {pendingLabels[i.reason]}
      </span>
    ),
  },
];

export function PendingList({
  reason,
  skip,
  onReason,
  onSkip,
}: {
  reason: PendingReason | "";
  skip: number;
  onReason(reason: PendingReason | ""): void;
  onSkip(skip: number): void;
}) {
  const params = { ...(reason ? { reason } : {}), skip, limit: PAGE_SIZE };
  const query = useQuery({
    queryKey: ["admin", "bling", "pending", params],
    queryFn: ({ signal }) => adminApi.blingPending(params, signal),
    placeholderData: keepPreviousData,
  });
  const items = query.data?.items ?? [];

  return (
    <section className="adm-card" aria-labelledby="bling-pending-title">
      <h2 id="bling-pending-title">Pendências de cadastro</h2>
      <p className="adm-muted">{PENDING_NOTE}</p>
      <div className="adm-filterbar">
        <div className="adm-field">
          <label htmlFor="bling-pending-reason">Motivo</label>
          <select
            id="bling-pending-reason"
            value={reason}
            onChange={(e) => onReason(toReason(e.target.value))}
          >
            <option value="">Todos</option>
            {reasons.map((r) => (
              <option key={r} value={r}>
                {pendingLabels[r]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {query.error && items.length === 0 ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <DataTable
            caption="Variações com cadastro incompleto"
            columns={columns}
            rows={items}
            rowKey={(i) => `${i.variant_id}-${i.reason}`}
            loading={query.isPending}
            empty={
              <EmptyState title="Nenhuma pendência">
                Não há variações pendentes neste filtro.
              </EmptyState>
            }
          />
          {items.length > 0 && (
            <Pagination
              total={query.data?.meta.total ?? 0}
              skip={skip}
              limit={PAGE_SIZE}
              disabled={query.isFetching}
              onChange={onSkip}
            />
          )}
        </>
      )}
    </section>
  );
}
