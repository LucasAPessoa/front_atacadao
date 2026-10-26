import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createRequester, createTokenStore, send, sendPage } from "./http";

const memory = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k),
});

const reply = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });
const session = (n: number) => ({
  access_token: `a${n}`,
  refresh_token: `r${n}`,
  token_type: "bearer",
});

const failure = async (call: Promise<unknown>) => {
  try {
    await call;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error("esperava falha");
};

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  memory.clear();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

describe("send", () => {
  it("desembrulha data e preserva meta em Page<T>", async () => {
    fetchMock.mockResolvedValueOnce(
      reply(200, { data: [{ id: 1 }], meta: { total: 137, skip: 25, limit: 25 } }),
    );
    const page = await sendPage<{ id: number }>("/admin/products", {});
    expect(page.items).toEqual([{ id: 1 }]);
    expect(page.meta).toEqual({ total: 137, skip: 25, limit: 25 });
  });

  it("422 expõe errors[] por campo", async () => {
    fetchMock.mockResolvedValueOnce(
      reply(422, {
        detail: "Dados inválidos",
        errors: [{ loc: ["body", "name", "value"], msg: "obrigatório" }],
      }),
    );
    const error = await failure(send("/x", { method: "PATCH" }));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.errors).toEqual([{ loc: ["body", "name", "value"], msg: "obrigatório" }]);
  });

  it("422 no formato detail[] do FastAPI também vira errors[]", async () => {
    fetchMock.mockResolvedValueOnce(
      reply(422, { detail: [{ loc: ["query", "limit"], msg: "inválido", type: "x" }] }),
    );
    const error = await failure(send("/x", {}));
    expect(error.errors[0]).toEqual({ loc: ["query", "limit"], msg: "inválido" });
  });

  it("lê Retry-After e repassa o AbortSignal", async () => {
    fetchMock.mockResolvedValueOnce(reply(429, { detail: "Muitas" }, { "Retry-After": "12" }));
    const controller = new AbortController();
    const error = await failure(send("/x", { signal: controller.signal }));
    expect(error.retryAfter).toBe(12);
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal).toBe(controller.signal);
  });
});

describe("TokenStore", () => {
  it("chaves de refresh são independentes", () => {
    const a = createTokenStore("a.refresh");
    const b = createTokenStore("b.refresh");
    a.storeSession(session(1));
    expect(a.hasStoredSession()).toBe(true);
    expect(b.hasStoredSession()).toBe(false);
    expect(b.getAccessToken()).toBe("");
    b.storeSession(session(2));
    a.clearSession();
    expect(b.getRefreshToken()).toBe("r2");
    expect(a.getRefreshToken()).toBeNull();
  });

  it("refresh concorrente é single-flight e 401 refaz a chamada", async () => {
    const tokens = createTokenStore("k.refresh");
    const { request } = createRequester(tokens);
    tokens.storeSession(session(0));
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (String(url).endsWith("/auth/refresh")) return reply(200, { data: session(1) });
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === "Bearer a1" ? reply(200, { data: "ok" }) : reply(401, { detail: "x" });
    });
    const results = await Promise.all([request("/a", {}, true), request("/b", {}, true)]);
    expect(results).toEqual(["ok", "ok"]);
    const refreshes = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith("/auth/refresh"));
    expect(refreshes).toHaveLength(1);
  });

  it("401 sem refresh possível expira a sessão", async () => {
    const tokens = createTokenStore("k.refresh");
    const expired = vi.fn();
    tokens.setOnSessionExpired(expired);
    const { request } = createRequester(tokens);
    fetchMock.mockResolvedValue(reply(401, { detail: "x" }));
    await expect(request("/admin/x", {}, true)).rejects.toBeInstanceOf(ApiError);
    expect(expired).not.toHaveBeenCalled(); // sem refresh token, só repassa o 401
  });
});
