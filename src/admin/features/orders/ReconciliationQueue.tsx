import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { adminApi } from "../../api";
import type { ReconciliationQueueItem } from "../../api/types";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { type Column, DataTable } from "../../ui/DataTable";
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

  const columns: Column<ReconciliationQueueItem>[] = [
    {
      key: "order",
      header: "Pedido",
      width: 128,
      card: "field",
      render: (item) => <Link to={`/pedidos/${item.order_id}`}>Ver pedido</Link>,
    },
    {
      key: "reason",
      header: "Motivo",
      width: 280,
      wrap: true,
      card: "title",
      render: (item) => label(reconciliationReasonLabels, item.reason),
    },
    {
      key: "status",
      header: "Situação",
      width: 140,
      wrap: true,
      card: "field",
      render: (item) => label(reconciliationStatusLabels, item.status),
    },
    {
      key: "outcome",
      header: "Resultado",
      width: 200,
      wrap: true,
      render: (item) => label(reconciliationOutcomeLabels, item.outcome),
    },
    {
      key: "refund",
      header: "Estorno",
      width: 260,
      wrap: true,
      render: (item) =>
        item.refund_status ? (
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
        ),
    },
    {
      key: "action",
      header: "Ação",
      width: 168,
      minWidth: 140,
      card: "field",
      render: (item) => (
        <button
          type="button"
          className="adm-btn"
          disabled={reconcile.isPending}
          onClick={() => setTarget(item)}
        >
          {actionTexts.reconcile.button}
        </button>
      ),
    },
  ];

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
      <DataTable
        caption="Fila de conciliação de pagamentos"
        storageKey="conciliacao"
        columns={columns}
        rows={items}
        rowKey={(item) => item.id}
      />
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
