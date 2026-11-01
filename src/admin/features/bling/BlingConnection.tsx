import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { ApiError } from "../../../shared/http";
import { adminApi } from "../../api";
import type { BlingStatus } from "../../api/types";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { connectionReason, eventText, formatBlingDate } from "./labels";

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

/** Query string sem o parâmetro de resultado. */
export function withoutResult(params: URLSearchParams) {
  const next = new URLSearchParams(params);
  next.delete("resultado");
  return next;
}

export const blingStatusKey = ["bling", "status"] as const;

const labels: Record<BlingStatus["status"], string> = {
  CONNECTED: "Conectado",
  RECONNECT_REQUIRED: "Reconexão necessária",
  NOT_CONNECTED: "Não conectado",
};
const tones: Record<BlingStatus["status"], "success" | "danger" | "neutral"> = {
  CONNECTED: "success",
  RECONNECT_REQUIRED: "danger",
  NOT_CONNECTED: "neutral",
};

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
      <h2 id="bling-title">Conexão com o Bling</h2>
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
          {/* Estado e ação principal no topo: um primário por estado. */}
          <div className="adm-bling-head">
            <p className="adm-bling-state">
              Estado:{" "}
              <strong
                className="adm-badge"
                data-tone={tones[status.status]}
                data-status={status.status}
              >
                {labels[status.status]}
              </strong>
            </p>
            <div className="adm-actions">
              {!connected && (
                <button
                  type="button"
                  className="adm-btn adm-btn-primary"
                  disabled={p.busy}
                  onClick={p.onConnect}
                >
                  {status.status === "RECONNECT_REQUIRED" ? "Reconectar" : "Conectar"}
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
          </div>
          {status.status === "RECONNECT_REQUIRED" && (
            <p className="adm-alert adm-alert-danger" role="alert">
              A autorização do Bling expirou ou foi revogada. Reconecte para retomar a importação.
            </p>
          )}
          {status.status === "NOT_CONNECTED" && (
            <p className="adm-muted">
              Conecte a conta do Bling da loja para importar o catálogo e os preços.
            </p>
          )}
          {status.status !== "NOT_CONNECTED" && (
            <dl className="adm-dl">
              {status.company && (
                <>
                  <dt>Empresa</dt>
                  <dd>
                    {status.company.name} (ID {status.company.id})
                  </dd>
                </>
              )}
              <dt>Conectado em</dt>
              <dd>{formatBlingDate(status.connected_at)}</dd>
              <dt>Última renovação</dt>
              <dd>{formatBlingDate(status.last_refreshed_at)}</dd>
              {status.last_error && (
                <>
                  <dt>Último erro</dt>
                  <dd>
                    {capitalize(connectionReason(status.last_error.code))}, em{" "}
                    {formatBlingDate(status.last_error.at)}
                  </dd>
                </>
              )}
            </dl>
          )}
          {connected && <p className="adm-muted">Para trocar de conta, desconecte antes.</p>}
          <h3>Eventos recentes</h3>
          {status.recent_events.length === 0 ? (
            <p>Nenhum evento registrado.</p>
          ) : (
            <ul className="adm-list">
              {status.recent_events.map((event) => (
                <li key={`${event.at}-${event.event}`}>
                  {formatBlingDate(event.at)} · {eventText(event.event, event.reason)}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <ConfirmDialog
        open={p.confirming}
        title="Desconectar o Bling?"
        message="A importação do catálogo e dos preços fica parada até você conectar de novo."
        confirmLabel="Desconectar"
        cancelLabel="Voltar"
        tone="danger"
        busy={p.busy}
        onConfirm={p.onDisconnect}
        onCancel={p.onCancelDisconnect}
      />
    </section>
  );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function BlingConnection() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  // Aviso do retorno OAuth fica no estado; o parâmetro sai da URL (efeito) para o F5 não repeti-lo.
  const [result] = useState(() => resultFromParams(params));
  useEffect(() => {
    if (!params.has("resultado")) return;
    setParams(withoutResult(params), { replace: true });
  }, [params, setParams]);
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
      onDisconnect={() =>
        // Fecha o diálogo também na falha: o erro aparece no card, não atrás do overlay.
        void run(() => disconnect.mutateAsync()).finally(() => setConfirming(false))
      }
    />
  );
}
