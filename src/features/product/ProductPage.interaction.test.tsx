// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { Product } from "../../shared/types/domain";
import { ProductView } from "./ProductPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const product: Product = {
  id: "p1",
  name: "Arroz Tipo 1",
  is_active: true,
  categories: [],
  variants: [
    { id: "v1", variation_name: "Fardo", base_price: "20.00", stock_quantity: 50, is_active: true },
  ],
};
const extras = {
  images: [],
  tiers: [
    { id: "t5", product_id: "p1", min_quantity: 5, unit_price: "18.00" },
    { id: "t10", product_id: "p1", min_quantity: 10, unit_price: "15.00" },
  ],
  reviews: [],
  questions: [],
};

function Harness() {
  const [quantity, setQuantity] = useState(1);
  return (
    <ProductView
      product={product}
      extras={extras}
      variantId="v1"
      quantity={quantity}
      imageId=""
      adding={false}
      message=""
      onVariant={() => {}}
      onQuantity={setQuantity}
      onImage={() => {}}
      onAdd={() => {}}
    />
  );
}

let root: ReturnType<typeof createRoot> | undefined;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});
const mount = () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(<Harness />));
};
const click = (el: Element | null) => act(() => (el as HTMLElement).click());
const norm = (text: string | null | undefined) => (text ?? "").replace(/\s/g, " ");

describe("preço na página do produto", () => {
  it("recalcula o total e marca a faixa ativa ao mudar a quantidade", () => {
    mount();
    const total = () => norm(document.querySelector(".pdp-total")?.textContent);
    expect(total()).toContain("20,00");
    click(document.querySelector('[aria-label="Aumentar quantidade"]'));
    expect(total()).toContain("40,00");
    for (let i = 0; i < 3; i++) click(document.querySelector('[aria-label="Aumentar quantidade"]'));
    expect(total()).toContain("90,00");
    const active = document.querySelector("tr.active");
    expect(norm(active?.textContent)).toContain("5 a 9");
    expect(active?.textContent).toContain("seu preço");
    expect(document.querySelectorAll("tr.active")).toHaveLength(1);
    expect(document.querySelector(".price-hint")?.textContent).toContain("mais 5");
  });

  it("dropdown da tabela abre por padrão e alterna aria-expanded", () => {
    mount();
    const toggle = document.querySelector(".pdp-tiers-toggle");
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector("#pdp-tiers-table")).not.toBeNull();
    click(toggle);
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(document.querySelector("#pdp-tiers-table")).toBeNull();
    click(toggle);
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
  });
});
