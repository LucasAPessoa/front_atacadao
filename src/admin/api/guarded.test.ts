import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminTokens } from "../auth/session";
import { adminApi } from "./index";

const memory = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k),
});
const reply = (status: number) =>
  new Response(JSON.stringify(status < 400 ? { data: {} } : { detail: "x" }), { status });

let expired: ReturnType<typeof vi.fn<() => void>>;
beforeEach(() => {
  memory.clear();
  adminTokens.clearSession();
  expired = vi.fn<() => void>();
  adminTokens.setOnSessionExpired(() => expired());
});

describe("guarded", () => {
  it("401 sem refresh possível encerra a sessão", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(401)));
    await expect(adminApi.dashboard()).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledOnce();
  });
  it("403 em /admin/* encerra a sessão", async () => {
    adminTokens.storeSession({ access_token: "a", refresh_token: "r", token_type: "bearer" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(403)));
    await expect(adminApi.products()).rejects.toMatchObject({ status: 403 });
    expect(expired).toHaveBeenCalledOnce();
    expect(adminTokens.hasStoredSession()).toBe(false);
  });
  it("403 fora de /admin/ não encerra", async () => {
    adminTokens.storeSession({ access_token: "a", refresh_token: "r", token_type: "bearer" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(403)));
    await expect(adminApi.blingStatus()).rejects.toMatchObject({ status: 403 });
    expect(expired).not.toHaveBeenCalled();
    expect(adminTokens.hasStoredSession()).toBe(true);
  });
});
