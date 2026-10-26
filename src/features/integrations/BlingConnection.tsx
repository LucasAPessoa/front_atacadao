import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "../../services/client";
import type { BlingStatus, User } from "../../types/domain";

type Props = {
  token: string;
  user: User | null;
  onStatus?(status: BlingStatus["status"]): void;
};

export const resultMessages: Record<string, { tone: "ok" | "error"; text: string }> = {
  conectado: { tone: "ok", text: "Bling conectado com sucesso." },
  recusado: {
    tone: "error",
    text: "A autorização foi recusada no Bling. Tente conectar novamente.",
  },
  empresa_diferente: {
    tone: "error",
    text: "A conta do Bling autorizada pertence a outra empresa que não a vinculada a esta loja.",
  },
  invalido: {
    tone: "error",
    text: "O link de autorização é inválido ou expirou. Inicie a conexão novamente.",
  },
};

export function blingErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 503) return "Integração não configurada neste ambiente.";
    if (error.status === 403)
      return "Você não tem permissão para gerenciar a integração com o Bling.";
    if (error.status === 401) return "Sua sessão expirou. Entre novamente para continuar.";
    if (error.status === 409) return "O estado da conexão mudou. Atualizamos as informações.";
    return error.message;
  }
  return "Não foi possível falar com o servidor agora. Tente novamente.";
}

export async function startConnect(
  token: string,
  assign: (url: string) => void = (url) => window.location.assign(url),
) {
  const { authorize_url } = await api.blingConnect(token);
  assign(authorize_url);
}

const labels: Record<BlingStatus["status"], string> = {
  CONNECTED: "Conectado",
  RECONNECT_REQUIRED: "Reconexão necessária",
  NOT_CONNECTED: "Não conectado",
};
const fmt = (value: string | null) => (value ? new Date(value).toLocaleString("pt-BR") : "—");

type ViewProps = {
  status: BlingStatus | null;
  loading: boolean;
  busy: boolean;
  confirming: boolean;
  error: string;
  result: { tone: "ok" | "error"; text: string } | null;
  onConnect(): void;
  onAskDisconnect(): void;
  onCancelDisconnect(): void;
  onDisconnect(): void;
};

export function BlingConnectionView(p: ViewProps) {
  const { status } = p;
  const connected = status?.status === "CONNECTED";
  return (
    <section className="admin-page" aria-labelledby="bling-title">
      <h1 id="bling-title">Integração Bling</h1>
      {p.result && (
        <p
          className={p.result.tone === "error" ? "admin-feedback error" : "admin-feedback"}
          role={p.result.tone === "error" ? "alert" : "status"}
        >
          {p.result.text}
        </p>
      )}
      {p.error && (
        <p className="admin-feedback error" role="alert">
          {p.error}
        </p>
      )}
      {p.loading && <p role="status">Carregando estado da integração…</p>}
      {status && (
        <>
          <p>
            Estado: <strong data-status={status.status}>{labels[status.status]}</strong>
          </p>
          {status.status === "RECONNECT_REQUIRED" && (
            <p className="admin-feedback error" role="alert">
              A autorização do Bling expirou ou foi revogada. Reconecte para retomar a
              sincronização.
            </p>
          )}
          {status.company && (
            <p>
              Empresa: {status.company.name} (ID {status.company.id})
            </p>
          )}
          <p>Conectado em: {fmt(status.connected_at)}</p>
          <p>Última renovação: {fmt(status.last_refreshed_at)}</p>
          {status.last_error && (
            <p>
              Último erro: {status.last_error.code} em {fmt(status.last_error.at)}
            </p>
          )}
          <h2>Eventos recentes</h2>
          {status.recent_events.length === 0 ? (
            <p>Nenhum evento registrado.</p>
          ) : (
            <ul>
              {status.recent_events.map((event) => (
                <li key={`${event.at}-${event.event}`}>
                  {fmt(event.at)} · {event.event}
                  {event.reason ? ` · ${event.reason}` : ""}
                </li>
              ))}
            </ul>
          )}
          {p.confirming ? (
            <div role="alertdialog" aria-label="Confirmar desconexão">
              <p>Desconectar o Bling? A sincronização será interrompida até nova conexão.</p>
              <button type="button" className="danger" disabled={p.busy} onClick={p.onDisconnect}>
                Confirmar desconexão
              </button>
              <button type="button" disabled={p.busy} onClick={p.onCancelDisconnect}>
                Cancelar
              </button>
            </div>
          ) : (
            <div>
              {status.status !== "CONNECTED" && (
                <button type="button" className="primary" disabled={p.busy} onClick={p.onConnect}>
                  {status.status === "RECONNECT_REQUIRED" ? "Reconectar" : "Conectar"}
                </button>
              )}
              {status.status === "CONNECTED" && (
                <button type="button" className="primary" disabled>
                  Conectar
                </button>
              )}
              {status.status !== "NOT_CONNECTED" && (
                <button type="button" disabled={p.busy} onClick={p.onAskDisconnect}>
                  Desconectar
                </button>
              )}
            </div>
          )}
          {connected && <p>Para trocar de conta, desconecte antes.</p>}
        </>
      )}
    </section>
  );
}

export function BlingConnection({ token, user, onStatus }: Props) {
  const [status, setStatus] = useState<BlingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [result] = useState(() => {
    const value = new URLSearchParams(window.location.search).get("resultado");
    return value ? (resultMessages[value] ?? resultMessages.invalido) : null;
  });
  const isAdmin = user?.role.name === "admin";

  const apply = useCallback(
    (next: BlingStatus) => {
      setStatus(next);
      onStatus?.(next.status);
    },
    [onStatus],
  );
  const load = useCallback(async () => {
    try {
      apply(await api.blingStatus(token));
      setError("");
    } catch (e) {
      setError(blingErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [apply, token]);

  useEffect(() => {
    // Exibe o resultado e remove o parâmetro da URL.
    if (new URLSearchParams(window.location.search).has("resultado"))
      window.history.replaceState({}, "", window.location.pathname);
  }, []);
  useEffect(() => {
    if (token && isAdmin) void load();
    else setLoading(false);
  }, [token, isAdmin, load]);

  if (!token || !isAdmin)
    return (
      <section className="state-page">
        <h1>Acesso restrito</h1>
        <p>Entre com uma conta de administrador para gerenciar a integração.</p>
      </section>
    );

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(blingErrorMessage(e));
      if (e instanceof ApiError && e.status === 409) await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BlingConnectionView
      status={status}
      loading={loading}
      busy={busy}
      confirming={confirming}
      error={error}
      result={result}
      onConnect={() => void run(() => startConnect(token))}
      onAskDisconnect={() => setConfirming(true)}
      onCancelDisconnect={() => setConfirming(false)}
      onDisconnect={() =>
        void run(async () => {
          apply(await api.blingDisconnect(token));
          setConfirming(false);
        })
      }
    />
  );
}
