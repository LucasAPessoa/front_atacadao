// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../shared/http";
import type { Cart, Product } from "../../shared/types/domain";
import { CartPage } from "./CartPage";

const mocks = vi.hoisted(() => ({ updateCartItem: vi.fn(), products: vi.fn() }));
vi.mock("../../services/client", () => ({ api: mocks }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const catalog = [
  {
    id: "p1",
    name: "Arroz",
    variants: [
      {
        id: "v1",
        variation_name: "Fardo",
        base_price: "10.00",
        pricing_tiers: [
          { id: "a", min_quantity: 1, unit_price: "10.00" },
          { id: "b", min_quantity: 10, unit_price: "9.00" },
        ],
      },
    ],
  },
] as unknown as Product[];
const cartOf = (quantity: number, unit_price: string) =>
  ({
    total_items: quantity,
    total_amount: "0",
    items: [
      {
        id: "i1",
        variant_id: "v1",
        quantity,
        unit_price,
        subtotal: "0",
        variant: { base_price: "10.00", variation_name: "Fardo", product_id: "p1" },
      },
    ],
  }) as unknown as Cart;

let root: ReturnType<typeof createRoot> | undefined;
const onCart = vi.fn();
const onError = vi.fn();
async function mount(cart: Cart) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root?.render(
      <CartPage
        token="t"
        cart={cart}
        addresses={[]}
        onAddresses={async () => {}}
        onCart={onCart}
        onLogin={() => {}}
        onError={onError}
      />,
    ),
  );
}
const plus = () =>
  document.querySelector<HTMLButtonElement>('button[aria-label^="Aumentar quantidade"]');

beforeEach(() => {
  vi.resetAllMocks();
  mocks.products.mockResolvedValue(catalog);
});
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

describe("faixa aplicada no carrinho", () => {
  it("mostra 'a partir de N un.' quando o preço do item é o de uma faixa", async () => {
    await mount(cartOf(12, "9.00"));
    expect(document.querySelector(".tier-applied")?.textContent).toBe("a partir de 10 un.");
  });
  it("sem faixa na linha de 1 unidade", async () => {
    await mount(cartOf(3, "10.00"));
    expect(document.querySelector(".tier-applied")).toBeNull();
  });
});

describe("409 de estoque ao alterar a quantidade", () => {
  it("mostra a mensagem e ajusta para available", async () => {
    mocks.updateCartItem.mockRejectedValueOnce(
      new ApiError(409, "Só temos 5 em estoque.", [], undefined, 5),
    );
    await mount(cartOf(5, "10.00"));
    await act(async () => plus()?.click());
    expect(mocks.updateCartItem).toHaveBeenNthCalledWith(1, "t", "i1", 6);
    expect(document.querySelector(".cart-notice")?.textContent).toBe("Só temos 5 em estoque.");
    expect(onError).not.toHaveBeenCalled();
    // available igual à quantidade atual: nada a reenviar.
    expect(mocks.updateCartItem).toHaveBeenCalledTimes(1);
  });
  it("com available menor, reenvia a quantidade ajustada", async () => {
    const fresh = cartOf(3, "10.00");
    mocks.updateCartItem
      .mockRejectedValueOnce(new ApiError(409, "Só temos 3 em estoque.", [], undefined, 3))
      .mockResolvedValueOnce(fresh);
    await mount(cartOf(5, "10.00"));
    await act(async () => plus()?.click());
    expect(mocks.updateCartItem).toHaveBeenNthCalledWith(2, "t", "i1", 3);
    expect(onCart).toHaveBeenCalledWith(fresh);
  });
  it("409 sem available segue para onError", async () => {
    const failure = new ApiError(409, "outro conflito");
    mocks.updateCartItem.mockRejectedValueOnce(failure);
    await mount(cartOf(5, "10.00"));
    await act(async () => plus()?.click());
    expect(onError).toHaveBeenCalledWith(failure);
  });
});
