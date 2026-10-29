import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError } from "../../../shared/http";
import { adminApi } from "../../api";
import type { AdminOrderDetail } from "../../api/types";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { EmptyState } from "../../ui/EmptyState";
import { ErrorState } from "../../ui/ErrorState";
import { SkeletonRows } from "../../ui/Skeleton";
import { useToast } from "../../ui/Toast";
import { errorMessage } from "../../ui/errors";
import { formatBRL } from "../products/format";
import {
  type OrderActionKey,
  actionTexts,
  formatDateTime,
  label,
  paymentMethodLabels,
  reconciliationOutcomeLabels,
  reconciliationReasonLabels,
  reconciliationStatusLabels,
  statusLabel,
  statusTone,
  transactionStatusLabels,
} from "./labels";

const ADDRESS_LABELS: [string, string][] = [
  ["recipient_name", "Destinatário"],
  ["street", "Rua"],
  ["number", "Número"],
  ["complement", "Complemento"],
  ["neighborhood", "Bairro"],
  ["city", "Cidade"],
  ["state", "UF"],
  ["zip_code", "CEP"],
];

const KNOWN_ACTIONS: readonly string[] = ["cancel", "reconcile", "request_refund"];

export type OrderDetailViewProps = {
  order: AdminOrderDetail;
  pending: OrderActionKey | null;
  busy: boolean;
  failure: string;
  onRequest(action: OrderActionKey): void;
  onConfirm(): void;
  onCancel(): void;
};

export function OrderDetailView({
  order,
  pending,
  busy,
  failure,
  onRequest,
  onConfirm,
  onCancel,
}: OrderDetailViewProps) {
  const actions = order.allowed_actions.filter((a): a is OrderActionKey =>
    KNOWN_ACTIONS.includes(a),
  );
  const address = order.shipping_address_snapshot;
  const addressRows = ADDRESS_LABELS.filter(([key]) => address[key]);
  return (
    <section aria-labelledby="adm-page-title">
      <div className="adm-page-header">
        <h1 id="adm-page-title">Pedido {order.order_code}</h1>
        <Link to="/pedidos">Voltar para pedidos</Link>
      </div>
      <p>
        <span className="adm-badge" data-tone={statusTone(order.status)}>
          {statusLabel(order.status)}
        </span>{" "}
        <span className="adm-muted">Criado em {formatDateTime(order.created_at)}</span>
      </p>
      {failure && (
        <p className="adm-alert adm-alert-danger" role="alert">
          {failure}
        </p>
      )}
      {actions.length > 0 && (
        <div className="adm-bulk" role="toolbar" aria-label="Ações do pedido">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              className="adm-btn"
              disabled={busy}
              onClick={() => onRequest(action)}
            >
              {actionTexts[action].button}
            </button>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={pending !== null}
        title={pending ? actionTexts[pending].title : ""}
        message={pending ? actionTexts[pending].message : ""}
        tone={pending ? actionTexts[pending].tone : "default"}
        busy={busy}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />

      <div className="adm-card">
        <h2>Cliente</h2>
        <p>
          {order.customer.full_name}
          <span className="adm-muted"> · {order.customer.email}</span>
        </p>
      </div>

      <div className="adm-card">
        <h2>Itens</h2>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <caption className="adm-sr-only">Itens do pedido</caption>
            <thead>
              <tr>
                <th scope="col">Produto</th>
                <th scope="col">SKU</th>
                <th scope="col" className="adm-num">
                  Qtd.
                </th>
                <th scope="col" className="adm-num">
                  Preço unit.
                </th>
                <th scope="col" className="adm-num">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.product_name_snapshot}
                    <div className="adm-muted">{item.variation_name_snapshot}</div>
                  </td>
                  <td>{item.sku_snapshot}</td>
                  <td className="adm-num">{item.quantity}</td>
                  <td className="adm-num">{formatBRL(item.unit_price_snapshot)}</td>
                  <td className="adm-num">{formatBRL(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="adm-dl adm-dl-money">
          <dt>Subtotal</dt>
          <dd>{formatBRL(order.subtotal_amount)}</dd>
          {order.discount_amount && order.discount_amount !== "0.00" && (
            <>
              <dt>Desconto{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt>
              <dd>-{formatBRL(order.discount_amount)}</dd>
            </>
          )}
          <dt>Frete{order.shipping_service_name ? ` (${order.shipping_service_name})` : ""}</dt>
          <dd>{formatBRL(order.shipping_fee)}</dd>
          <dt>Total</dt>
          <dd>
            <strong>{formatBRL(order.total_amount)}</strong>
          </dd>
        </dl>
      </div>

      <div className="adm-card">
        <h2>Pagamento</h2>
        {order.reconciliation && (
          <p className="adm-alert adm-alert-warning">
            Conciliação: {label(reconciliationReasonLabels, order.reconciliation.reason)} ·{" "}
            {label(reconciliationStatusLabels, order.reconciliation.status)}
            {order.reconciliation.outcome &&
              ` · ${label(reconciliationOutcomeLabels, order.reconciliation.outcome)}`}
          </p>
        )}
        {order.transactions.length === 0 ? (
          <p className="adm-muted">Nenhuma transação registrada.</p>
        ) : (
          <ul>
            {order.transactions.map((t) => (
              <li key={t.id}>
                {label(paymentMethodLabels, t.payment_method)} · {formatBRL(t.amount)} ·{" "}
                {label(transactionStatusLabels, t.status)}
                {t.paid_at && ` · pago em ${formatDateTime(t.paid_at)}`}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="adm-card">
        <h2>Endereço de entrega</h2>
        {addressRows.length === 0 ? (
          <p className="adm-muted">Endereço não informado.</p>
        ) : (
          <dl className="adm-dl">
            {addressRows.map(([key, text]) => (
              <div key={key} style={{ display: "contents" }}>
                <dt>{text}</dt>
                <dd>{String(address[key])}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="adm-card">
        <h2>Histórico de status</h2>
        {order.status_history.length === 0 ? (
          <p className="adm-muted">Sem alterações registradas.</p>
        ) : (
          <ol>
            {order.status_history.map((h) => (
              <li key={`${h.created_at}-${h.new_status}`}>
                {formatDateTime(h.created_at)}:{" "}
                {h.old_status ? `${statusLabel(h.old_status)} → ` : ""}
                {statusLabel(h.new_status)}
                <span className="adm-muted"> · {h.changed_by ?? "Sistema"}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

const run: Record<OrderActionKey, (id: string) => Promise<unknown>> = {
  cancel: (id) => adminApi.cancelOrder(id),
  reconcile: (id) => adminApi.reconcileOrder(id),
  request_refund: (id) => adminApi.requestRefund(id),
};

export function OrderDetail() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pending, setPending] = useState<OrderActionKey | null>(null);
  const [failure, setFailure] = useState("");
  const query = useQuery({
    queryKey: ["admin", "order", id],
    queryFn: ({ signal }) => adminApi.order(id, signal),
  });
  const action = useMutation({
    mutationFn: (key: OrderActionKey) => run[key](id),
  });

  const confirm = async () => {
    if (!pending) return;
    const key = pending;
    setFailure("");
    try {
      await action.mutateAsync(key);
      toast.push("success", actionTexts[key].done);
    } catch (error) {
      // 400/409 trazem o motivo do servidor em `detail`.
      const text =
        error instanceof ApiError && [400, 409].includes(error.status)
          ? error.message
          : errorMessage(error);
      setFailure(text);
      toast.push("error", text);
    }
    setPending(null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "order", id] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "reconciliation-queue"] }),
    ]);
  };

  if (query.isPending) return <SkeletonRows />;
  if (query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 422))
    return <EmptyState title="Pedido não encontrado">Ele pode ter sido removido.</EmptyState>;
  if (query.error || !query.data)
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return (
    <OrderDetailView
      order={query.data}
      pending={pending}
      busy={action.isPending}
      failure={failure}
      onRequest={setPending}
      onConfirm={() => void confirm()}
      onCancel={() => setPending(null)}
    />
  );
}
