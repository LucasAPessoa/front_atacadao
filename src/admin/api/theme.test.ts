import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminTokens } from "../auth/session";
import { adminApi } from "./index";

const memory = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k),
});
const ok = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 });

beforeEach(() => {
  memory.clear();
  adminTokens.storeSession({ access_token: "a", refresh_token: "r", token_type: "bearer" });
});

describe("serviço de aparência", () => {
  it("getThemes lê data de /admin/store/themes", async () => {
    const list = [{ key: "gondola", name: "Gôndola", description: "d" }];
    const fetchMock = vi.fn().mockResolvedValue(ok(list));
    vi.stubGlobal("fetch", fetchMock);
    await expect(adminApi.getThemes()).resolves.toEqual(list);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/admin\/store\/themes$/);
  });
  it("getStoreTheme lê data de /store/theme", async () => {
    const settings = { theme: "gondola", brand_color: null, updated_at: null };
    const fetchMock = vi.fn().mockResolvedValue(ok(settings));
    vi.stubGlobal("fetch", fetchMock);
    await expect(adminApi.getStoreTheme()).resolves.toEqual(settings);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/store\/theme$/);
  });
  it("updateStoreTheme envia PUT com theme e brand_color", async () => {
    const settings = {
      theme: "gondola",
      brand_color: "#112233",
      updated_at: "2026-10-27T10:00:00",
    };
    const fetchMock = vi.fn().mockResolvedValue(ok(settings));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      adminApi.updateStoreTheme({ theme: "gondola", brand_color: "#112233" }),
    ).resolves.toEqual(settings);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/admin\/store\/theme$/);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ theme: "gondola", brand_color: "#112233" });
  });
  it("422 vira ApiError com status", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ detail: "inválido" }), { status: 422 })),
    );
    await expect(
      adminApi.updateStoreTheme({ theme: "x", brand_color: null }),
    ).rejects.toMatchObject({ status: 422 });
  });
});
