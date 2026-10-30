// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Cart } from "../../shared/types/domain";
import { CartPage } from "./CartPage";

let products: () => Promise<unknown>;
vi.mock("../../services/client", () => ({
  api: { products: () => products() },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const withVariant = {
  id: "i1",
  variant_id: "v1",
  quantity: 2,
  unit_price: "10.00",
  subtotal: "20.00",
  variant: { base_price: "10.00", variation_name: "Cor:Preto", product_id: "p1" },
};
const cartOf = (items: unknown[]) =>
  ({ total_items: items.length, total_amount: "20.00", items }) as unknown as Cart;

let root: ReturnType<typeof createRoot> | undefined;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});
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
        onCart={() => {}}
        onLogin={() => {}}
        onError={() => {}}
      />,
    ),
  );
  return host;
}

describe("carrinho com catálogo incompleto", () => {
  it.each([
    ["produto do item ausente no catálogo", [{ id: "outro", name: "Outro", variants: [] }]],
    ["lista com entradas nulas", [null, undefined]],
    ["produtos sem name nem variants", [{ id: "p1" }]],
    ["resposta que não é lista", { detail: "x" }],
  ])("não quebra: %s", async (_label, list) => {
    products = async () => list;
    const box = await mount(cartOf([withVariant]));
    expect(box.querySelector(".cart-name")?.textContent).toContain("Cor: Preto");
  });

  it("item sem variant não derruba a página", async () => {
    products = async () => [];
    const { variant: _omit, ...bare } = withVariant;
    const box = await mount(cartOf([bare, withVariant]));
    expect(box.querySelectorAll(".cart-name")).toHaveLength(2);
  });
});
