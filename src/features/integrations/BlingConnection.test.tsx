import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Layout } from "../../components/Layout";
import { ApiError, api } from "../../services/client";
import type { BlingStatus } from "../../shared/types/domain";
import {
  BlingConnectionView,
  blingErrorMessage,
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
  it("CONNECTED mostra empresa, erro, eventos e Conectar desabilitado", () => {
    const html = view({
      ...base,
      status: "CONNECTED",
      company: { id: "99", name: "Loja X" },
      connected_at: "2026-01-01T10:00:00Z",
      last_error: { code: "rate", at: "2026-01-02T10:00:00Z" },
      recent_events: [{ event: "connected", reason: null, at: "2026-01-01T10:00:00Z" }],
    });
    expect(html).toContain("Loja X (ID 99)");
    expect(html).toContain("Último erro: rate");
    expect(html).toContain("connected");
    expect(html).toContain('disabled=""');
    expect(html).toContain(">Desconectar<");
  });
  it("RECONNECT_REQUIRED oferece Reconectar e alerta", () => {
    const html = view({ ...base, status: "RECONNECT_REQUIRED" });
    expect(html).toContain("Reconectar");
    expect(html).toContain('role="alert"');
  });
  it("desconectar pede confirmação explícita", () => {
    const html = view({ ...base, status: "CONNECTED" }, { confirming: true });
    expect(html).toContain("Confirmar desconexão");
    expect(html).toContain("Cancelar");
  });
  it("conectar chama /connect e redireciona", async () => {
    vi.spyOn(api, "blingConnect").mockResolvedValue({ authorize_url: "https://bling/x" });
    const assign = vi.fn();
    await startConnect("t", assign);
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
  it("layout avisa reconexão só para admin", () => {
    const admin = { id: "1", email: "a@a", role: { name: "admin" } } as never;
    const html = renderToStaticMarkup(
      <Layout user={admin} cartCount={0} onLogout={() => {}} path="/" reconnectBling>
        x
      </Layout>,
    );
    expect(html).toContain("precisa ser refeita");
    expect(html).toContain("Integração Bling");
  });
});
