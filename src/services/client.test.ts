import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, clearSession, getAccessToken, setOnSessionExpired, storeSession } from "./client";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

const json = (status: number, data?: unknown) =>
  new Response(JSON.stringify(status < 400 ? { data } : { detail: "erro" }), { status });
const session = (n: number) => ({ access_token: `a${n}`, refresh_token: `r${n}`, token_type: "bearer" });
const auth = (call: unknown[]) => (call[1] as RequestInit & { headers: Record<string, string> }).headers.Authorization;
const urls = (f: ReturnType<typeof vi.fn>) => f.mock.calls.map((c) => String(c[0]));
const input = { address_id: "x", shipping_service_id: 1, expected_total_amount: "10.00" };

let fetchMock: ReturnType<typeof vi.fn>;
let expired: ReturnType<typeof vi.fn<() => void>>;

beforeEach(() => {
  store.clear();
  clearSession();
  storeSession(session(0));
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  expired = vi.fn<() => void>();
  setOnSessionExpired(() => expired());
});

describe("refresh e retry", () => {
  it("401 -> refresh -> retry ok, access só em memória", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401))
      .mockResolvedValueOnce(json(200, session(1)))
      .mockResolvedValueOnce(json(200, { id: "u" }));
    await expect(api.me("a0")).resolves.toEqual({ id: "u" });
    expect(fetchMock.mock.calls[1][1].body).toBe(JSON.stringify({ refresh_token: "r0" }));
    expect(auth(fetchMock.mock.calls[2])).toBe("Bearer a1");
    expect(getAccessToken()).toBe("a1");
    expect(store.get("ecommerce-atacadao.refresh-token")).toBe("r1");
    expect([...store.keys()]).toEqual(["ecommerce-atacadao.refresh-token"]);
  });

  it("refresh falha -> sessão limpa e erro propagado", async () => {
    fetchMock.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(401));
    await expect(api.me("a0")).rejects.toMatchObject({ status: 401 });
    expect(getAccessToken()).toBe("");
    expect(store.size).toBe(0);
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it("requests concorrentes com 401 -> um único refresh", async () => {
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (String(url).endsWith("/auth/refresh")) return json(200, session(1));
      const bearer = (init.headers as Record<string, string>).Authorization;
      return bearer === "Bearer a1" ? json(200, { ok: true }) : json(401);
    });
    await Promise.all([api.me("a0"), api.cart("a0")]);
    expect(urls(fetchMock).filter((u) => u.endsWith("/auth/refresh"))).toHaveLength(1);
  });

  it("reenvia mesma Idempotency-Key e mesmo corpo", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401))
      .mockResolvedValueOnce(json(200, session(1)))
      .mockResolvedValueOnce(json(200, { order_id: "o" }));
    await api.mercadoPago("a0", input, "key-123");
    const [first, , retry] = fetchMock.mock.calls;
    expect(first[1].headers["Idempotency-Key"]).toBe("key-123");
    expect(retry[1].headers["Idempotency-Key"]).toBe("key-123");
    expect(retry[1].body).toBe(first[1].body);
  });

  it("/auth/* nunca dispara refresh", async () => {
    fetchMock.mockResolvedValue(json(401));
    await expect(api.login("a@b.c", "x")).rejects.toMatchObject({ status: 401 });
    await expect(api.logout("a0", "r0")).rejects.toMatchObject({ status: 401 });
    expect(urls(fetchMock).some((u) => u.endsWith("/auth/refresh"))).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refresh rejeitado (401) limpa; 503 ou rede mantém o refresh token", async () => {
    fetchMock.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(503));
    await expect(api.me("a0")).rejects.toMatchObject({ status: 401 });
    expect(store.get("ecommerce-atacadao.refresh-token")).toBe("r0");
    expect(expired).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(json(401)).mockRejectedValueOnce(new TypeError("network"));
    await expect(api.me("a0")).rejects.toMatchObject({ status: 401 });
    expect(store.get("ecommerce-atacadao.refresh-token")).toBe("r0");
    expect(expired).not.toHaveBeenCalled();
  });

  it("401 com bearer já rotacionado repete sem novo refresh", async () => {
    fetchMock.mockImplementationOnce(async () => {
      storeSession(session(1)); // outra request rotacionou durante o voo
      return json(401);
    }).mockResolvedValueOnce(json(200, { id: "u" }));
    await expect(api.me("a0")).resolves.toEqual({ id: "u" });
    expect(urls(fetchMock).some((u) => u.endsWith("/auth/refresh"))).toBe(false);
    expect(auth(fetchMock.mock.calls[1])).toBe("Bearer a1");
  });
});
