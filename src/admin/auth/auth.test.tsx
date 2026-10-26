import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createTokenStore } from "../../shared/http";
import {
  AuthProvider,
  NOT_ADMIN_MESSAGE,
  NotAdminError,
  authenticate,
  invalidatesSession,
} from "./AuthProvider";
import { RequireAdmin, guardDecision, safeReturnTo } from "./RequireAdmin";
import { ADMIN_REFRESH_KEY, adminTokens } from "./session";

const memory = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k),
});
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(status < 400 ? { data } : { detail: "x" }), { status });
const session = { access_token: "a", refresh_token: "r", token_type: "bearer" };
const user = (role: string) => ({ id: "1", email: "u@x", role: { name: role } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  memory.clear();
  adminTokens.clearSession();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
const urls = () => fetchMock.mock.calls.map((c) => String(c[0]));

describe("login do portal", () => {
  it("recusa não admin, revoga o refresh e não abre sessão", async () => {
    fetchMock
      .mockResolvedValueOnce(reply(session))
      .mockResolvedValueOnce(reply(user("user")))
      .mockResolvedValueOnce(reply({ revoked: true }));
    const error = await authenticate("u@x", "pw").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotAdminError);
    expect((error as Error).message).toBe(NOT_ADMIN_MESSAGE);
    expect(urls()[2]).toMatch(/\/auth\/logout$/);
    expect(adminTokens.hasStoredSession()).toBe(false);
    expect(adminTokens.getAccessToken()).toBe("");
  });

  it("admin abre sessão na chave do portal, sem tocar na da loja", async () => {
    fetchMock.mockResolvedValueOnce(reply(session)).mockResolvedValueOnce(reply(user("admin")));
    await authenticate("a@x", "pw");
    expect(memory.get(ADMIN_REFRESH_KEY)).toBe("r");
    expect(memory.has("ecommerce-atacadao.refresh-token")).toBe(false);
    const storefront = createTokenStore("ecommerce-atacadao.refresh-token");
    expect(storefront.hasStoredSession()).toBe(false);
  });
});

describe("guard", () => {
  it("espera a restauração sem redirecionar", () => {
    expect(guardDecision("restoring", "/pedidos")).toEqual({ kind: "wait" });
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AuthProvider>
          <RequireAdmin />
        </AuthProvider>
      </MemoryRouter>,
    );
    // sem sessão guardada o provider já é anonymous: não renderiza conteúdo protegido
    expect(html).not.toContain("Painel");
  });
  it("só redireciona depois, com returnTo", () => {
    expect(guardDecision("anonymous", "/pedidos?x=1")).toEqual({
      kind: "redirect",
      to: "/login?returnTo=%2Fpedidos%3Fx%3D1",
    });
    expect(guardDecision("authenticated", "/")).toEqual({ kind: "allow" });
  });
  it("returnTo externo é descartado", () => {
    expect(safeReturnTo("//evil.com")).toBe("/");
    expect(safeReturnTo("https://evil.com")).toBe("/");
    expect(safeReturnTo("/pedidos")).toBe("/pedidos");
  });
});

describe("restauração de sessão", () => {
  it("só rejeição do servidor ou papel errado invalida", () => {
    expect(invalidatesSession(new ApiError(401, "x"))).toBe(true);
    expect(invalidatesSession(new ApiError(403, "x"))).toBe(true);
    expect(invalidatesSession(new ApiError(400, "x"))).toBe(true);
    expect(invalidatesSession(new NotAdminError())).toBe(true);
    expect(invalidatesSession(new ApiError(503, "x"))).toBe(false);
    expect(invalidatesSession(new TypeError("Failed to fetch"))).toBe(false);
  });
  it("rede/5xx preserva o refresh; 401 limpa", async () => {
    adminTokens.storeSession(session);
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(adminTokens.refreshSession(false)).rejects.toBeInstanceOf(TypeError);
    expect(adminTokens.hasStoredSession()).toBe(true);
    fetchMock.mockResolvedValueOnce(reply(null, 503));
    await expect(adminTokens.refreshSession(false)).rejects.toBeInstanceOf(ApiError);
    expect(adminTokens.hasStoredSession()).toBe(true);
    fetchMock.mockResolvedValueOnce(reply(null, 401));
    await expect(adminTokens.refreshSession(false)).rejects.toBeInstanceOf(ApiError);
    expect(adminTokens.hasStoredSession()).toBe(false);
  });
  it("guard mostra erro com retry, sem redirecionar", () => {
    expect(guardDecision("error", "/pedidos")).toEqual({ kind: "error" });
  });
});
