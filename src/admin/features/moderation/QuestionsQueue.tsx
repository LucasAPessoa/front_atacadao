import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";
import { adminApi } from "../../api";
import type { ModerationQuestion, QuestionFilter } from "../../api/types";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { EmptyState } from "../../ui/EmptyState";
import { ErrorState } from "../../ui/ErrorState";
import { Pagination } from "../../ui/Pagination";
import { SkeletonRows } from "../../ui/Skeleton";
import { useToast } from "../../ui/Toast";
import { errorMessage } from "../../ui/errors";
import { formatDateTime } from "../orders/labels";
import { PAGE_SIZE, QUESTION_STATUSES } from "./ModerationPage";

const schema = z.object({
  answer: z.string().trim().min(1, "Escreva a resposta antes de salvar."),
});
type AnswerForm = z.infer<typeof schema>;

function AnswerEditor({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: string;
  busy: boolean;
  onSave(text: string): void;
  onCancel?(): void;
}) {
  const { register, handleSubmit, formState } = useForm<AnswerForm>({
    resolver: zodResolver(schema),
    defaultValues: { answer: initial },
  });
  const id = useId();
  const error = formState.errors.answer?.message;
  return (
    <form noValidate onSubmit={handleSubmit((v) => onSave(v.answer.trim()))} className="adm-stack">
      <div className="adm-field">
        <label htmlFor={id}>Resposta</label>
        <textarea
          id={id}
          rows={3}
          aria-invalid={error ? true : undefined}
          {...register("answer")}
        />
        {error && (
          <span className="adm-field-error" role="alert">
            {error}
          </span>
        )}
      </div>
      <div className="adm-actions">
        <button type="submit" className="adm-btn adm-btn-primary" disabled={busy}>
          Salvar resposta
        </button>
        {onCancel && (
          <button type="button" className="adm-btn" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

export function QuestionsQueue({
  status,
  skip,
  onStatus,
  onSkip,
}: {
  status: QuestionFilter;
  skip: number;
  onStatus(status: QuestionFilter): void;
  onSkip(skip: number): void;
}) {
  const client = useQueryClient();
  const toast = useToast();
  const [toDelete, setToDelete] = useState<ModerationQuestion | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const params = { status, skip, limit: PAGE_SIZE };
  const query = useQuery({
    queryKey: ["admin", "moderation", "questions", params],
    queryFn: ({ signal }) => adminApi.questions(params, signal),
    placeholderData: keepPreviousData,
  });

  const act = useMutation({
    mutationFn: (job: { run(): Promise<unknown>; done: string }) => job.run(),
    onSuccess: (_data, job) => {
      toast.push("success", job.done);
      setToDelete(null);
      setEditing(null);
    },
    onError: (error) => {
      toast.push("error", errorMessage(error));
      setToDelete(null);
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["admin", "moderation"] }),
  });
  const answer = (question: ModerationQuestion, text: string) =>
    act.mutate({
      run: () => adminApi.answerQuestion(question.id, text),
      done: "Resposta salva.",
    });

  const items = query.data?.items ?? [];
  return (
    <>
      <div className="adm-filterbar">
        <div className="adm-field">
          <label htmlFor="mod-question-status">Status</label>
          <select
            id="mod-question-status"
            value={status}
            onChange={(e) => onStatus(e.target.value as QuestionFilter)}
          >
            {QUESTION_STATUSES.map(([key, text]) => (
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
        <EmptyState title="Nenhuma pergunta">Não há perguntas neste filtro.</EmptyState>
      ) : (
        <>
          <ul className="adm-list" aria-label="Perguntas" aria-busy={query.isFetching}>
            {items.map((question) => (
              <li key={question.id} className="adm-card adm-moderation-item">
                <p>
                  <strong>{question.question_text}</strong>
                </p>
                <p className="adm-muted">
                  <Link to={`/produtos/${question.product.id}`}>{question.product.name}</Link> ·{" "}
                  {question.author.full_name} · {formatDateTime(question.created_at)}
                </p>
                {question.answer_text && editing !== question.id ? (
                  <>
                    <p>Resposta: {question.answer_text}</p>
                    <div className="adm-actions">
                      <button
                        type="button"
                        className="adm-btn"
                        onClick={() => setEditing(question.id)}
                      >
                        Editar resposta
                      </button>
                      <button
                        type="button"
                        className="adm-btn adm-btn-danger"
                        disabled={act.isPending}
                        onClick={() => setToDelete(question)}
                      >
                        Excluir
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <AnswerEditor
                      initial={question.answer_text ?? ""}
                      busy={act.isPending}
                      onSave={(text) => answer(question, text)}
                      onCancel={question.answer_text ? () => setEditing(null) : undefined}
                    />
                    {!question.answer_text && (
                      <div className="adm-actions">
                        <button
                          type="button"
                          className="adm-btn adm-btn-danger"
                          disabled={act.isPending}
                          onClick={() => setToDelete(question)}
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </>
                )}
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
        title="Excluir esta pergunta?"
        message="A pergunta e a resposta serão removidas de forma permanente."
        confirmLabel="Excluir"
        tone="danger"
        busy={act.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          const target = toDelete;
          if (target)
            act.mutate({
              run: () => adminApi.deleteQuestion(target.id),
              done: "Pergunta excluída.",
            });
        }}
      />
    </>
  );
}
