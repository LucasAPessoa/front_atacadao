// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { Product } from "../../shared/types/domain";
import { ProductGrid } from "./CatalogPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const product = {
  id: "p-1",
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
});
