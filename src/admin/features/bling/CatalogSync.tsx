import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "../../../shared/http";
import { adminApi } from "../../api";
import type { CatalogSyncRun, CatalogSyncRuns } from "../../api/types";

export const statusLabels: Record<CatalogSyncRun["status"], string> = {
  RUNNING: "Em andamento",
  SUCCESS: "Concluída",
  PARTIAL: "Parcial",
  FAILED: "Falhou",
  SKIPPED: "Ignorada",
};
export const triggerLabels: Record<CatalogSyncRun["trigger"], string> = {
  SCHEDULED: "Automática",
  MANUAL: "Manual",
};
const countLabels: [keyof CatalogSyncRun["counts"], string][] = [
  ["created", "Criados"],
  ["updated", "Atualizados"],
  ["deactivated", "Desativados"],
  ["blocked", "Bloqueados"],
  ["unchanged", "Sem alteração"],
  ["failed", "Com falha"],
];
const fmt = (value: string | null) => (value ? new Date(value).toLocaleString("pt-BR") : "—");

export function catalogSyncErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409 && error.message === "Importação já em andamento")
      return "Já existe uma importação em andamento.";
    if (error.status === 409)
      return "Conexão com o Bling inativa. Conecte o Bling acima antes de importar.";
    if (error.status === 503) return "Integração não configurada neste ambiente.";
    if (error.status === 403) return "Você não tem permissão para importar o catálogo do Bling.";
    if (error.status === 401) return "Sua sessão expirou. Entre novamente para continuar.";
    return error.message;
  }
  return "Não foi possível falar com o servidor agora. Tente novamente.";
}

export const isInProgress = (error: unknown) =>
  error instanceof ApiError &&
  error.status === 409 &&
  error.message === "Importação já em andamento";

// A execução corrente também vem em `items`; evita exibi-la duas vezes.
export const historyItems = (data: CatalogSyncRuns) =>
  data.items.filter((r) => r.id !== data.current?.id);

export const RUNS_POLL_MS = 3000;
export const runsKey = ["bling", "catalog-sync", "runs"] as const;

/** Consulta `runs` a cada 3 s enquanto houver execução RUNNING; desliga quando termina. */
export const pollInterval = (data: CatalogSyncRuns | null | undefined) =>
  isRunning(data ?? null) ? RUNS_POLL_MS : false;

export const isRunning = (data: CatalogSyncRuns | null) =>
  !!data && (data.current?.status === "RUNNING" || data.items.some((r) => r.status === "RUNNING"));

function Counts({ run }: { run: CatalogSyncRun }) {
  return (
    <ul className="adm-list">
      {countLabels.map(([key, label]) => (
        <li key={key}>
          {label}: {run.counts[key]}
        </li>
      ))}
    </ul>
  );
}

type ViewProps = {
  data: CatalogSyncRuns | null;
  loading: boolean;
  busy: boolean;
  error: string;
  /** Aviso não fatal (ex.: 409 de importação já em andamento). */
  warning?: string;
  onImport(): void;
  onRefresh(): void;
};

export function CatalogSyncView(p: ViewProps) {
  const running = isRunning(p.data);
  const current = p.data?.current ?? null;
  return (
    <section className="adm-card" aria-labelledby="catalog-sync-title">
      <h2 id="catalog-sync-title">Catálogo do Bling</h2>
      {p.error && (
        <p className="adm-alert adm-alert-danger" role="alert">
          {p.error}
        </p>
      )}
      {p.warning && (
        <p className="adm-alert adm-alert-warning" role="status">
          {p.warning}
        </p>
      )}
      <div className="adm-actions">
        <button
          type="button"
          className="adm-btn adm-btn-primary"
          disabled={p.busy || running}
          onClick={p.onImport}
        >
          Importar agora
        </button>
        <button
          type="button"
          className="adm-btn"
          disabled={p.loading || p.busy}
          onClick={p.onRefresh}
        >
          Atualizar
        </button>
      </div>
      {p.loading && <p role="status">Carregando importações…</p>}
      <h3>Execução corrente</h3>
      {current ? (
        <div data-status={current.status}>
          <p>
            Status: <strong>{statusLabels[current.status]}</strong>
          </p>
          <p>Fase: {current.phase ?? "—"}</p>
          <p>Início: {fmt(current.started_at)}</p>
          <Counts run={current} />
        </div>
      ) : (
        <p>Nenhuma execução em andamento.</p>
      )}
      <h3>Histórico</h3>
      {p.data && historyItems(p.data).length === 0 ? (
        <p>Nenhuma importação registrada.</p>
      ) : (
        <ul className="adm-list">
          {p.data &&
            historyItems(p.data).map((run) => (
              <li key={run.id} data-status={run.status}>
                <strong>{statusLabels[run.status]}</strong> · {triggerLabels[run.trigger]} · Início:{" "}
                {fmt(run.started_at)} · Fim: {fmt(run.finished_at)}
                {run.reason ? ` · ${run.reason}` : ""}
                <Counts run={run} />
                {run.errors.length > 0 && (
                  <details>
                    <summary>Erros por produto ({run.errors.length})</summary>
                    <ul>
                      {run.errors.map((e) => (
                        <li key={`${e.bling_id}-${e.code}-${e.message}`}>
                          {e.bling_id ?? "Geral"} · {e.code} · {e.message}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

export function CatalogSync() {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const query = useQuery({
    queryKey: runsKey,
    queryFn: ({ signal }) => adminApi.blingCatalogRuns(20, signal),
    refetchInterval: (q) => pollInterval(q.state.data),
  });
  const start = useMutation({ mutationFn: () => adminApi.blingCatalogSync() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: runsKey });

  const importNow = async () => {
    setError("");
    setWarning("");
    try {
      await start.mutateAsync();
      await refresh();
    } catch (e) {
      if (isInProgress(e)) {
        // O 409 diz que já há uma execução: mostra o aviso e passa a acompanhá-la.
        setWarning(catalogSyncErrorMessage(e));
        await refresh();
      } else setError(catalogSyncErrorMessage(e));
    }
  };

  return (
    <CatalogSyncView
      data={query.data ?? null}
      loading={query.isPending}
      busy={start.isPending}
      error={error || (query.isError ? catalogSyncErrorMessage(query.error) : "")}
      warning={warning}
      onImport={() => void importNow()}
      onRefresh={() => void refresh()}
    />
  );
}
