// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Product } from "../../shared/types/domain";
import { CatalogPage, ProductGrid } from "./CatalogPage";

const { addCartItem } = vi.hoisted(() => ({ addCartItem: vi.fn() }));
vi.mock("../../services/client", () => ({
  api: {
    products: async () => [product],
    categories: async () => [],
    allPricingTiers: async () => [],
    addCartItem,
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const product = {
  id: "p-1",
  is_active: true,
  name: "Arroz 5kg",
  brand: "Marca",
  categories: [{ id: "c-1", name: "Mercearia" }],
  main_image_url: null,
  variants: [
    {
      id: "v-1",
      variation_name: "Pacote",
      base_price: "25.00",
      is_active: true,
      stock_quantity: 4,
    },
  ],
} as unknown as Product;

function Harness() {
  const [adding, setAdding] = useState("");
  return (
    <ProductGrid
      loading={false}
      unavailable={false}
      visible={[product]}
      adding={adding}
      onAdd={(item) => setAdding(adding ? "" : item.id)}
      onOpen={() => {}}
    />
  );
}

let root: ReturnType<typeof createRoot> | undefined;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

describe("ProductGrid", () => {
  it("mantém o mesmo botão e o foco após adicionar ao carrinho", () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<Harness />));
    const button = host.querySelector<HTMLButtonElement>("button.product-add");
    expect(button).not.toBeNull();
    button?.focus();
    expect(document.activeElement).toBe(button);
    act(() => button?.click());
    const after = host.querySelector<HTMLButtonElement>("button.product-add");
    expect(after).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(after?.getAttribute("aria-disabled")).toBe("true");
  });

  it("ignora segundo clique enquanto o item está sendo adicionado", async () => {
    let resolve: (cart: unknown) => void = () => {};
    addCartItem.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const onCart = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(
        <CatalogPage
          token="t"
          onLogin={() => {}}
          onCart={onCart}
          onError={() => {}}
          mode="catalog"
          query=""
        />,
      );
    });
    const button = host.querySelector<HTMLButtonElement>("button.product-add");
    await act(async () => button?.click());
    await act(async () => button?.click());
    expect(addCartItem).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ id: "cart" }));
    expect(onCart).toHaveBeenCalledTimes(1);
  });

  it("card sem controle de quantidade, com dica da próxima faixa", () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() =>
      root?.render(
        <ProductGrid
          loading={false}
          unavailable={false}
          visible={[product]}
          tiers={[{ id: "t", product_id: "p-1", min_quantity: 5, unit_price: "22.00" }]}
          adding=""
          onAdd={() => {}}
          onOpen={() => {}}
        />,
      ),
    );
    expect(host.querySelector("input")).toBeNull();
    expect(host.querySelector(".product-add")?.textContent).toBe("Adicionar");
    expect(host.querySelector(".product-hint")?.textContent).toContain("A partir de 5");
  });

  it("tabela de preços do card abre fechada e alterna aria-expanded", () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() =>
      root?.render(
        <ProductGrid
          loading={false}
          unavailable={false}
          visible={[product]}
          tiers={[{ id: "t", product_id: "p-1", min_quantity: 5, unit_price: "22.00" }]}
          adding=""
          onAdd={() => {}}
          onOpen={() => {}}
        />,
      ),
    );
    const toggle = host.querySelector<HTMLButtonElement>(".card-tiers-toggle");
    const panel = host.querySelector<HTMLElement>(".card-tiers");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(panel?.hidden).toBe(true);
    act(() => toggle?.click());
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(panel?.hidden).toBe(false);
    expect(panel?.textContent).toContain("1 a 4");
    expect(panel?.textContent).toContain("5 ou mais");
    expect(panel?.textContent).toContain("R$");
  });
});
