import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../services/client";
import type { Product, Variant } from "../../types/domain";
import { addToCart, loadProduct, type ProductApi } from "./loader";

const variant = (stock: number): Variant => ({
  id: "v",
  variation_name: "Cx",
  base_price: "10.00",
  stock_quantity: stock,
  is_active: true,
});
const product = {
  id: "p",
  name: "X",
  is_active: true,
  categories: [],
  variants: [variant(2)],
} as Product;
const fakeApi = (over: Partial<ProductApi> = {}): ProductApi => ({
  product: async () => product,
  productImages: async () => [],
  pricingTiers: async () => [],
  productReviews: async () => [],
  productQuestions: async () => [],
  ...over,
});

describe("loadProduct", () => {
  it("404 e 422 viram não encontrado", async () => {
    for (const status of [404, 422])
      expect(
        (
          await loadProduct(
            "p",
            fakeApi({ product: async () => Promise.reject(new ApiError(status, "x")) }),
          )
        ).status,
      ).toBe("not-found");
  });
  it("produto inativo vira não encontrado", async () => {
    const off = fakeApi({ product: async () => ({ ...product, is_active: false }) });
    expect((await loadProduct("p", off)).status).toBe("not-found");
  });
  it("erro de rede ou 500 vira erro (com retry possível)", async () => {
    expect(
      (
        await loadProduct(
          "p",
          fakeApi({ product: async () => Promise.reject(new TypeError("net")) }),
        )
      ).status,
    ).toBe("error");
    expect(
      (
        await loadProduct(
          "p",
          fakeApi({ product: async () => Promise.reject(new ApiError(500, "x")) }),
        )
      ).status,
    ).toBe("error");
    expect((await loadProduct("p", fakeApi())).status).toBe("ready");
  });
  it("extras falhando não derrubam a página", async () => {
    const fail = () => Promise.reject(new ApiError(500, "x"));
    const result = await loadProduct(
      "p",
      fakeApi({
        productImages: fail,
        pricingTiers: fail,
        productReviews: fail,
        productQuestions: fail,
      }),
    );
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.extras.images).toEqual([]);
      expect(result.extras.tiers).toEqual([]);
      expect(result.extras.reviews).toBeNull();
      expect(result.extras.questions).toBeNull();
    }
  });
});

describe("addToCart", () => {
  const deps = () => ({
    addCartItem: vi.fn(async () => ({ id: "c", items: [], total_items: 3 })),
    onLogin: vi.fn(),
    onCart: vi.fn(),
    onError: vi.fn(),
  });
  it("sem token chama onLogin e não a API", async () => {
    const d = deps();
    expect(await addToCart({ ...d, token: "", variant: variant(2), quantity: 1 })).toBe(false);
    expect(d.onLogin).toHaveBeenCalled();
    expect(d.addCartItem).not.toHaveBeenCalled();
  });
  it("variação sem estoque não chama a API", async () => {
    const d = deps();
    await addToCart({ ...d, token: "t", variant: variant(0), quantity: 1 });
    expect(d.addCartItem).not.toHaveBeenCalled();
    expect(d.onLogin).not.toHaveBeenCalled();
  });
  it("adiciona com a quantidade e atualiza o carrinho; erro vai para onError", async () => {
    const d = deps();
    expect(await addToCart({ ...d, token: "t", variant: variant(5), quantity: 3 })).toBe(true);
    expect(d.addCartItem).toHaveBeenCalledWith("t", "v", 3);
    expect(d.onCart).toHaveBeenCalled();
    const boom = new ApiError(409, "x");
    d.addCartItem.mockRejectedValueOnce(boom);
    expect(await addToCart({ ...d, token: "t", variant: variant(5), quantity: 1 })).toBe(false);
    expect(d.onError).toHaveBeenCalledWith(boom);
  });
});
