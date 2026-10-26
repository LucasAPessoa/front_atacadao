import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "../../services/client";
import type { CatalogSyncRun, CatalogSyncRuns, User } from "../../types/domain";

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

export const isRunning = (data: CatalogSyncRuns | null) =>
  !!data && (data.current?.status === "RUNNING" || data.items.some((r) => r.status === "RUNNING"));

function Counts({ run }: { run: CatalogSyncRun }) {
  return (
    <ul>
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
  onImport(): void;
  onRefresh(): void;
};

export function CatalogSyncView(p: ViewProps) {
  const running = isRunning(p.data);
  const current = p.data?.current ?? null;
  return (
    <section className="admin-page" aria-labelledby="catalog-sync-title">
      <h2 id="catalog-sync-title">Catálogo do Bling</h2>
      {p.error && (
        <p className="admin-feedback error" role="alert">
          {p.error}
        </p>
      )}
      <div>
        <button type="button" className="primary" disabled={p.busy || running} onClick={p.onImport}>
          Importar agora
        </button>
        <button type="button" disabled={p.loading || p.busy} onClick={p.onRefresh}>
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
        <ul>
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

export function CatalogSync({ token, user }: { token: string; user: User | null }) {
  const [data, setData] = useState<CatalogSyncRuns | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = user?.role.name === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.blingCatalogRuns(token, 20));
      setError("");
    } catch (e) {
      setError(catalogSyncErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && isAdmin) void load();
    else setLoading(false);
  }, [token, isAdmin, load]);

  if (!token || !isAdmin) return null;

  const importNow = async () => {
    setBusy(true);
    setError("");
    try {
      await api.blingCatalogSync(token);
      await load();
    } catch (e) {
      // load() limpa o erro ao concluir; o aviso de "em andamento" vem depois dele.
      if (isInProgress(e)) await load();
      setError(catalogSyncErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <CatalogSyncView
      data={data}
      loading={loading}
      busy={busy}
      error={error}
      onImport={() => void importNow()}
      onRefresh={() => void load()}
    />
  );
}
