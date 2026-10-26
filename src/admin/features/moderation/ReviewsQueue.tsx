import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { adminApi } from "../../api";
import type { ModerationReview, ReviewFilter } from "../../api/types";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { EmptyState } from "../../ui/EmptyState";
import { ErrorState } from "../../ui/ErrorState";
import { Pagination } from "../../ui/Pagination";
import { SkeletonRows } from "../../ui/Skeleton";
import { useToast } from "../../ui/Toast";
import { errorMessage } from "../../ui/errors";
import { formatDateTime } from "../orders/labels";
import { PAGE_SIZE, REVIEW_STATUSES } from "./ModerationPage";

export function ReviewsQueue({
  status,
  skip,
  onStatus,
  onSkip,
}: {
  status: ReviewFilter;
  skip: number;
  onStatus(status: ReviewFilter): void;
  onSkip(skip: number): void;
}) {
  const client = useQueryClient();
  const toast = useToast();
  const [toDelete, setToDelete] = useState<ModerationReview | null>(null);
  const params = { status, skip, limit: PAGE_SIZE };
  const query = useQuery({
    queryKey: ["admin", "moderation", "reviews", params],
    queryFn: ({ signal }) => adminApi.reviews(params, signal),
    placeholderData: keepPreviousData,
  });

  const act = useMutation({
    mutationFn: (job: { run(): Promise<unknown>; done: string }) => job.run(),
    onSuccess: (_data, job) => {
      toast.push("success", job.done);
      setToDelete(null);
    },
    onError: (error) => {
      toast.push("error", errorMessage(error));
      setToDelete(null);
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["admin", "moderation"] }),
  });
  const setApproval = (review: ModerationReview, approved: boolean) =>
    act.mutate({
      run: () => adminApi.setReviewApproval(review.id, approved),
      done: approved ? "Avaliação aprovada." : "Avaliação ocultada.",
    });

  const items = query.data?.items ?? [];
  return (
    <>
      <div className="adm-filterbar">
        <div className="adm-field">
          <label htmlFor="mod-review-status">Status</label>
          <select
            id="mod-review-status"
            value={status}
            onChange={(e) => onStatus(e.target.value as ReviewFilter)}
          >
            {REVIEW_STATUSES.map(([key, text]) => (
              <option key={key} value={key}>
                {text}
              </option>
            ))}
          </select>
        </div>
      </div>
      {query.error && items.length === 0 ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.isPending ? (
        <SkeletonRows />
      ) : items.length === 0 ? (
        <EmptyState title="Nenhuma avaliação">Não há avaliações neste filtro.</EmptyState>
      ) : (
        <>
          <ul className="adm-list" aria-label="Avaliações" aria-busy={query.isFetching}>
            {items.map((review) => (
              <li key={review.id} className="adm-card adm-moderation-item">
                <p>
                  <strong role="img" aria-label={`Nota ${review.rating} de 5`}>
                    {"★".repeat(review.rating)}
                    {"☆".repeat(Math.max(0, 5 - review.rating))}
                  </strong>{" "}
                  <span
                    className="adm-badge"
                    data-tone={review.is_approved ? "success" : "warning"}
                  >
                    {review.is_approved ? "Aprovada" : "Pendente"}
                  </span>
                </p>
                <p>{review.comment || <span className="adm-muted">Sem comentário.</span>}</p>
                <p className="adm-muted">
                  <Link to={`/produtos/${review.product.id}`}>{review.product.name}</Link> ·{" "}
                  {review.author.full_name} · {formatDateTime(review.created_at)}
                </p>
                <div className="adm-actions">
                  {review.is_approved ? (
                    <button
                      type="button"
                      className="adm-btn"
                      disabled={act.isPending}
                      onClick={() => setApproval(review, false)}
                    >
                      Ocultar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="adm-btn adm-btn-primary"
                      disabled={act.isPending}
                      onClick={() => setApproval(review, true)}
                    >
                      Aprovar
                    </button>
                  )}
                  <button
                    type="button"
                    className="adm-btn adm-btn-danger"
                    disabled={act.isPending}
                    onClick={() => setToDelete(review)}
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            total={query.data?.meta.total ?? 0}
            skip={skip}
            limit={PAGE_SIZE}
            disabled={query.isFetching}
            onChange={onSkip}
          />
        </>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title="Excluir esta avaliação?"
        message="A avaliação será removida de forma permanente."
        confirmLabel="Excluir"
        tone="danger"
        busy={act.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          const target = toDelete;
          if (target)
            act.mutate({
              run: () => adminApi.deleteReview(target.id),
              done: "Avaliação excluída.",
            });
        }}
      />
    </>
  );
}
