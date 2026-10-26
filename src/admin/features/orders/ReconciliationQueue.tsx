import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { adminApi } from "../../api";
import type { ReconciliationQueueItem } from "../../api/types";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { EmptyState } from "../../ui/EmptyState";
import { ErrorState } from "../../ui/ErrorState";
import { SkeletonRows } from "../../ui/Skeleton";
import { useToast } from "../../ui/Toast";
import { errorMessage } from "../../ui/errors";
import {
  actionTexts,
  formatDateTime,
  label,
  reconciliationOutcomeLabels,
  reconciliationReasonLabels,
  reconciliationStatusLabels,
  refundStatusLabels,
} from "./labels";

export function ReconciliationQueue() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [target, setTarget] = useState<ReconciliationQueueItem | null>(null);
  const [failure, setFailure] = useState("");
  const query = useQuery({
    queryKey: ["admin", "reconciliation-queue"],
    queryFn: ({ signal }) => adminApi.reconciliationQueue(0, 50, signal),
  });
  const reconcile = useMutation({
    mutationFn: (orderId: string) => adminApi.reconcileOrder(orderId),
  });

  const confirm = async () => {
    if (!target) return;
    setFailure("");
    try {
      await reconcile.mutateAsync(target.order_id);
      toast.push("success", actionTexts.reconcile.done);
    } catch (error) {
      setFailure(errorMessage(error));
      toast.push("error", errorMessage(error));
    }
    setTarget(null);
    await queryClient.invalidateQueries({ queryKey: ["admin", "reconciliation-queue"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "order", target.order_id] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
  };

  if (query.isPending) return <SkeletonRows />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const items = query.data ?? [];
  if (items.length === 0)
    return <EmptyState title="Fila vazia">Nenhum pagamento aguardando conciliação.</EmptyState>;
  return (
    <>
      {failure && (
        <p className="adm-alert adm-alert-danger" role="alert">
          {failure}
        </p>
      )}
      <div className="adm-table-wrap">
        <table className="adm-table">
          <caption className="adm-sr-only">Fila de conciliação de pagamentos</caption>
          <thead>
            <tr>
              <th scope="col">Pedido</th>
              <th scope="col">Motivo</th>
              <th scope="col">Situação</th>
              <th scope="col">Resultado</th>
              <th scope="col">Estorno</th>
              <th scope="col">Ação</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link to={`/pedidos/${item.order_id}`}>Ver pedido</Link>
                </td>
                <td>{label(reconciliationReasonLabels, item.reason)}</td>
                <td>{label(reconciliationStatusLabels, item.status)}</td>
                <td>{label(reconciliationOutcomeLabels, item.outcome)}</td>
                <td>
                  {item.refund_status ? (
                    <>
                      {label(refundStatusLabels, item.refund_status)}
                      {item.refund_next_retry_at && (
                        <div className="adm-muted">
                          Nova tentativa: {formatDateTime(item.refund_next_retry_at)}
                        </div>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="adm-btn"
                    disabled={reconcile.isPending}
                    onClick={() => setTarget(item)}
                  >
                    {actionTexts.reconcile.button}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={target !== null}
        title={actionTexts.reconcile.title}
        message={actionTexts.reconcile.message}
        confirmLabel="Reconciliar"
        busy={reconcile.isPending}
        onConfirm={() => void confirm()}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}
