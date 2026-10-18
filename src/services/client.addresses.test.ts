import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "./client";

const mockFetch = (status: number, body: unknown) => {
  const fn = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
};
const call = (fn: ReturnType<typeof vi.fn>) => ({
  url: String(fn.mock.calls[0][0]),
  init: fn.mock.calls[0][1] as RequestInit,
});
const input = { zip_code: "01310100", street: "Av. Paulista", city: "São Paulo", state: "SP" };
afterEach(() => vi.unstubAllGlobals());

describe("endereços", () => {
  it("createAddress envia POST autenticado e devolve data", async () => {
    const fn = mockFetch(201, { data: { id: "a1", ...input, is_default: true } });
    const result = await api.createAddress("tok", { ...input, is_default: true });
    const { url, init } = call(fn);
    expect(url).toMatch(/\/addresses\/$/);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body as string)).toEqual({ ...input, is_default: true });
    expect(result.id).toBe("a1");
  });
  it("updateAddress envia PATCH em /addresses/{id}", async () => {
    const fn = mockFetch(200, { data: { id: "a1" } });
    await api.updateAddress("tok", "a1", { street: "Rua B" });
    const { url, init } = call(fn);
    expect(url).toMatch(/\/addresses\/a1$/);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ street: "Rua B" });
  });
  it("setDefaultAddress envia POST em /addresses/{id}/default", async () => {
    const fn = mockFetch(200, { data: { id: "a1", is_default: true } });
    await api.setDefaultAddress("tok", "a1");
    const { url, init } = call(fn);
    expect(url).toMatch(/\/addresses\/a1\/default$/);
    expect(init.method).toBe("POST");
  });
  it("deleteAddress envia DELETE em /addresses/{id}", async () => {
    const fn = mockFetch(200, { status: "success", data: {} });
    await api.deleteAddress("tok", "a1");
    const { url, init } = call(fn);
    expect(url).toMatch(/\/addresses\/a1$/);
    expect(init.method).toBe("DELETE");
  });
  it("propaga erro da API como ApiError", async () => {
    mockFetch(404, { detail: "Endereço não encontrado." });
    await expect(api.deleteAddress("tok", "x")).rejects.toMatchObject({
      status: 404,
      message: "Endereço não encontrado.",
    });
    mockFetch(404, { detail: "x" });
    await expect(api.deleteAddress("tok", "x")).rejects.toBeInstanceOf(ApiError);
  });
});
