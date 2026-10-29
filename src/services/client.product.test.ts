import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";

vi.stubGlobal("localStorage", {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
});

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

describe("catálogo do produto", () => {
  it("filtra imagens, faixas, avaliações e perguntas por product_id", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    await Promise.all([
      api.product(id),
      api.productImages(id),
      api.variantPricingTiers("vv"),
      api.productReviews(id),
      api.productQuestions(id),
    ]);
    const urls = fetchMock.mock.calls.map((call) =>
      String(call[0]).replace(/^.*\/api\/v1|^https?:\/\/[^/]+/, ""),
    );
    expect(urls.map((u) => u.replace(/^.*?(\/catalog)/, "$1"))).toEqual([
      `/catalog/products/${id}`,
      `/catalog/product-images/?product_id=${id}`,
      `/catalog/pricing-tiers/?variant_id=vv`,
      `/catalog/product-reviews/?product_id=${id}`,
      `/catalog/product-questions/?product_id=${id}`,
    ]);
  });
  it("adiciona ao carrinho com a quantidade escolhida", async () => {
    await api.addCartItem("t", "v1", 4);
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body).toEqual({ variant_id: "v1", quantity: 4 });
  });
  it("expõe `available` do 409 de estoque (na raiz do JSON)", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Estoque insuficiente.", available: 3 }), {
        status: 409,
      }),
    );
    const error = await api.addCartItem("t", "v1", 9).catch((e) => e);
    expect(error).toMatchObject({ status: 409, message: "Estoque insuficiente.", available: 3 });
  });
});
