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

async function last(run: () => Promise<unknown>) {
  const fetchMock = vi.fn().mockResolvedValue(ok({}));
  vi.stubGlobal("fetch", fetchMock);
  await run();
  const [url, init] = fetchMock.mock.calls[0];
  return { url: String(url).replace(/^.*\/api\/v1/, ""), init };
}

describe("tabela de preços por variação (admin)", () => {
  it("savePricingTable faz PUT com unit_price e tiers", async () => {
    const body = { unit_price: "27.90", tiers: [{ min_quantity: 10, unit_price: "25.90" }] };
    const { url, init } = await last(() => adminApi.savePricingTable("p1", "v1", body));
    expect(url).toMatch(/\/admin\/products\/p1\/variants\/v1\/pricing$/);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual(body);
  });
  it("confirmProductPricing e confirmPricingBatch usam POST", async () => {
    const one = await last(() => adminApi.confirmProductPricing("p1"));
    expect(one.url).toMatch(/\/admin\/products\/p1\/confirm-pricing$/);
    expect(one.init.method).toBe("POST");
    const batch = await last(() => adminApi.confirmPricingBatch(["a", "b"]));
    expect(batch.url).toMatch(/\/admin\/products\/confirm-pricing$/);
    expect(JSON.parse(batch.init.body)).toEqual({ product_ids: ["a", "b"] });
  });
  it("configuração de confirmação automática: GET e PUT só com auto_confirm", async () => {
    const get = await last(() => adminApi.getPricingSettings());
    expect(get.url).toMatch(/\/admin\/store\/pricing-settings$/);
    const put = await last(() => adminApi.updatePricingSettings({ auto_confirm: true }));
    expect(put.init.method).toBe("PUT");
    expect(JSON.parse(put.init.body)).toEqual({ auto_confirm: true });
  });
  it("502 do Bling chega como ApiError com a mensagem do servidor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "O Bling não aceitou o novo preço." }), {
          status: 502,
        }),
      ),
    );
    await expect(
      adminApi.savePricingTable("p", "v", { unit_price: "1.00", tiers: [] }),
    ).rejects.toMatchObject({ status: 502, message: "O Bling não aceitou o novo preço." });
  });
});
