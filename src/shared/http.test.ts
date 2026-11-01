import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  READ_TIMEOUT_MS,
  RequestTimeoutError,
  WRITE_TIMEOUT_MS,
  createRequester,
  createTokenStore,
  send,
  sendPage,
} from "./http";

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
    // O fetch recebe um sinal combinado: cancelar quem chamou cancela a requisição.
    const passed = (fetchMock.mock.calls[0][1] as RequestInit).signal as AbortSignal;
    expect(passed.aborted).toBe(false);
  });

  it("cancelar quem chamou aborta o fetch e repassa o AbortError (não é timeout)", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const call = send("/x", { signal: controller.signal });
    controller.abort();
    const error = await failure(call);
    expect(error).not.toBeInstanceOf(RequestTimeoutError);
    expect((error as unknown as DOMException).name).toBe("AbortError");
  });
});

describe("prazo das requisições", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const hang = () =>
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );

  it("GET sem resposta em 20 s falha com RequestTimeoutError e aborta o fetch", async () => {
    hang();
    const call = failure(send("/lento", {}));
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS - 1);
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const error = await call;
    expect(error).toBeInstanceOf(RequestTimeoutError);
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
  });

  it("escrita (POST) tem prazo maior", async () => {
    hang();
    let settled = false;
    const call = failure(send("/checkout", { method: "POST", body: "{}" })).finally(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS + 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(WRITE_TIMEOUT_MS);
    expect(await call).toBeInstanceOf(RequestTimeoutError);
  });

  it("resposta no prazo limpa o timer (sem abort tardio)", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { data: 1 }));
    expect(await send("/rapido", {})).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
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
