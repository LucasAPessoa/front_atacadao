import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { ApiError } from "../../../shared/http";
import { adminApi } from "../../api";
import type { BlingStatus } from "../../api/types";

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
  assign: (url: string) => void = (url) => window.location.assign(url),
) {
  const { authorize_url } = await adminApi.blingConnect();
  assign(authorize_url);
}

/** Retorno do OAuth: /integracoes/bling?resultado=conectado|recusado|empresa_diferente|invalido. */
export function resultFromParams(params: URLSearchParams) {
  const value = params.get("resultado");
  return value ? (resultMessages[value] ?? resultMessages.invalido) : null;
}

export const blingStatusKey = ["bling", "status"] as const;

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
    <section className="adm-card" aria-labelledby="bling-title">
      <h1 id="bling-title">Integração Bling</h1>
      {p.result && (
        <p
          className={
            p.result.tone === "error" ? "adm-alert adm-alert-danger" : "adm-alert adm-alert-success"
          }
          role={p.result.tone === "error" ? "alert" : "status"}
        >
          {p.result.text}
        </p>
      )}
      {p.error && (
        <p className="adm-alert adm-alert-danger" role="alert">
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
            <p className="adm-alert adm-alert-danger" role="alert">
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
            <ul className="adm-list">
              {status.recent_events.map((event) => (
                <li key={`${event.at}-${event.event}`}>
                  {fmt(event.at)} · {event.event}
                  {event.reason ? ` · ${event.reason}` : ""}
                </li>
              ))}
            </ul>
          )}
          {p.confirming ? (
            <div
              role="alertdialog"
              aria-label="Confirmar desconexão"
              className="adm-alert adm-alert-warning"
            >
              <p>Desconectar o Bling? A sincronização será interrompida até nova conexão.</p>
              <button
                type="button"
                className="adm-btn adm-btn-danger"
                disabled={p.busy}
                onClick={p.onDisconnect}
              >
                Confirmar desconexão
              </button>
              <button
                type="button"
                className="adm-btn"
                disabled={p.busy}
                onClick={p.onCancelDisconnect}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="adm-actions">
              {status.status !== "CONNECTED" && (
                <button
                  type="button"
                  className="adm-btn adm-btn-primary"
                  disabled={p.busy}
                  onClick={p.onConnect}
                >
                  {status.status === "RECONNECT_REQUIRED" ? "Reconectar" : "Conectar"}
                </button>
              )}
              {status.status === "CONNECTED" && (
                <button type="button" className="adm-btn adm-btn-primary" disabled>
                  Conectar
                </button>
              )}
              {status.status !== "NOT_CONNECTED" && (
                <button
                  type="button"
                  className="adm-btn"
                  disabled={p.busy}
                  onClick={p.onAskDisconnect}
                >
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

export function BlingConnection() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  // Exibe o resultado do retorno OAuth e remove o parâmetro da URL (o aviso fica no estado).
  const [result] = useState(() => {
    const parsed = resultFromParams(params);
    if (params.has("resultado")) {
      const next = new URLSearchParams(params);
      next.delete("resultado");
      setParams(next, { replace: true });
    }
    return parsed;
  });
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState("");

  const query = useQuery({
    queryKey: blingStatusKey,
    queryFn: ({ signal }) => adminApi.blingStatus(signal),
  });
  const connect = useMutation({ mutationFn: () => startConnect() });
  const disconnect = useMutation({
    mutationFn: () => adminApi.blingDisconnect(),
    onSuccess: (next) => {
      queryClient.setQueryData(blingStatusKey, next);
      setConfirming(false);
    },
  });
  const busy = connect.isPending || disconnect.isPending;

  const run = async (action: () => Promise<unknown>) => {
    setActionError("");
    try {
      await action();
    } catch (e) {
      setActionError(blingErrorMessage(e));
      if (e instanceof ApiError && e.status === 409)
        await queryClient.invalidateQueries({ queryKey: blingStatusKey });
    }
  };

  return (
    <BlingConnectionView
      status={query.data ?? null}
      loading={query.isPending}
      busy={busy}
      confirming={confirming}
      error={actionError || (query.isError ? blingErrorMessage(query.error) : "")}
      result={result}
      onConnect={() => void run(() => connect.mutateAsync())}
      onAskDisconnect={() => setConfirming(true)}
      onCancelDisconnect={() => setConfirming(false)}
      onDisconnect={() => void run(() => disconnect.mutateAsync())}
    />
  );
}
