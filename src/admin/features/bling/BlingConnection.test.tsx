import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../shared/http";
import { adminApi } from "../../api";
import type { BlingStatus } from "../../api/types";
import {
  BlingConnectionView,
  blingErrorMessage,
  resultFromParams,
  withoutResult,
  resultMessages,
  startConnect,
} from "./BlingConnection";

const base: BlingStatus = {
  status: "NOT_CONNECTED",
  company: null,
  connected_at: null,
  last_refreshed_at: null,
  last_error: null,
  recent_events: [],
};
const view = (status: BlingStatus, extra = {}) =>
  renderToStaticMarkup(
    <BlingConnectionView
      status={status}
      loading={false}
      busy={false}
      confirming={false}
      error=""
      result={null}
      onConnect={() => {}}
      onAskDisconnect={() => {}}
      onCancelDisconnect={() => {}}
      onDisconnect={() => {}}
      {...extra}
    />,
  );

beforeEach(() => vi.restoreAllMocks());

describe("tela Bling", () => {
  it("NOT_CONNECTED oferece Conectar e não Desconectar", () => {
    const html = view(base);
    expect(html).toContain("Não conectado");
    expect(html).toContain(">Conectar<");
    expect(html).not.toContain("Desconectar");
  });
  it("CONNECTED: sem primário, com empresa, erro e eventos em português e datas de SP", () => {
    const html = view({
      ...base,
      status: "CONNECTED",
      company: { id: "99", name: "Loja X" },
      connected_at: "2026-01-01T10:00:00Z",
      last_error: { code: "ReadTimeout", at: "2026-01-02T10:00:00Z" },
      recent_events: [
        { event: "CONNECTED", reason: null, at: "2026-01-01T10:00:00Z" },
        { event: "REFRESH_FAILED", reason: "rejected_500", at: "2026-01-02T10:00:00Z" },
        { event: "CONNECT_REJECTED", reason: "empresa_diferente", at: "2026-01-03T10:00:00Z" },
      ],
    });
    expect(html).toContain("Loja X (ID 99)");
    expect(html).toContain("Motivo não identificado, em 02/01/2026, 07:00");
    expect(html).toContain("01/01/2026, 07:00 · Conectado");
    expect(html).toContain("Falha ao renovar a autorização: o Bling recusou a renovação");
    expect(html).toContain("Conexão recusada: a conta autorizada é de outra empresa");
    expect(
      view({
        ...base,
        status: "CONNECTED",
        recent_events: [
          { event: "DISCONNECTED", reason: "desconectado_pelo_admin", at: "x" },
          { event: "CONNECT_REJECTED", reason: "invalid_grant", at: "2026-01-01T10:00:00Z" },
        ],
      }),
    ).toMatch(/— · Desconectado por um administrador.*Conexão recusada: a autorização expirou/);
    for (const raw of ["ReadTimeout", "REFRESH_FAILED", "rejected_500", "empresa_diferente"])
      expect(html).not.toContain(raw);
    expect(html).not.toContain("adm-btn-primary");
    expect(html).not.toContain('disabled=""');
    expect(html).toContain(">Desconectar<");
  });
  it("estado e ação principal vêm antes dos eventos", () => {
    const html = view({ ...base, status: "NOT_CONNECTED" });
    expect(html.indexOf(">Conectar<")).toBeLessThan(html.indexOf("Eventos recentes"));
  });
  it("RECONNECT_REQUIRED oferece Reconectar e alerta", () => {
    const html = view({ ...base, status: "RECONNECT_REQUIRED" });
    expect(html).toContain("Reconectar");
    expect(html).toContain('role="alert"');
  });
  it("desconectar pede confirmação no diálogo padrão, com ação destrutiva e Voltar", () => {
    expect(view({ ...base, status: "CONNECTED" })).not.toContain('role="alertdialog"');
    const html = view({ ...base, status: "CONNECTED" }, { confirming: true });
    expect(html).toContain("Desconectar o Bling?");
    expect(html).toContain("adm-btn-danger");
    expect(html).toContain(">Voltar<");
  });
  it("conectar chama /connect e redireciona", async () => {
    vi.spyOn(adminApi, "blingConnect").mockResolvedValue({ authorize_url: "https://bling/x" });
    const assign = vi.fn();
    await startConnect(assign);
    expect(assign).toHaveBeenCalledWith("https://bling/x");
  });
  it("mensagens de resultado cobrem o contrato", () => {
    for (const k of ["conectado", "recusado", "empresa_diferente", "invalido"])
      expect(resultMessages[k].text).toBeTruthy();
    expect(view(base, { result: resultMessages.recusado })).toContain("recusada");
  });
  it("503, 403 e 409 têm mensagens próprias", () => {
    expect(blingErrorMessage(new ApiError(503, "x"))).toContain("não configurada neste ambiente");
    expect(blingErrorMessage(new ApiError(403, "x"))).toContain("permissão");
    expect(blingErrorMessage(new ApiError(409, "x"))).toContain("mudou");
  });
  it("retorno OAuth lê resultado da query; valor desconhecido vira inválido", () => {
    expect(resultFromParams(new URLSearchParams("resultado=conectado"))?.tone).toBe("ok");
    expect(resultFromParams(new URLSearchParams("resultado=xyz"))).toBe(resultMessages.invalido);
    expect(resultFromParams(new URLSearchParams("x=1"))).toBeNull();
    expect(withoutResult(new URLSearchParams("resultado=conectado&x=1")).toString()).toBe("x=1");
  });
});
