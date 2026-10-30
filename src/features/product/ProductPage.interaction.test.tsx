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
    {
      id: "v1",
      variation_name: "Fardo",
      base_price: "20.00",
      unit_price: "20.00",
      pricing_tiers: [
        { id: "t1", min_quantity: 1, unit_price: "20.00" },
        { id: "t5", min_quantity: 5, unit_price: "18.00" },
        { id: "t10", min_quantity: 10, unit_price: "15.00" },
      ],
      stock_quantity: 50,
      is_active: true,
    },
  ],
};
const extras = {
  images: [],
  reviews: [],
  questions: [],
};

function Harness({ description }: { description?: string }) {
  const [quantity, setQuantity] = useState(1);
  return (
    <ProductView
      product={{ ...product, description }}
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
const mount = (props: { description?: string } = {}) => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(<Harness {...props} />));
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
    expect(document.querySelector(".price-hint")?.textContent).toContain(
      "faltam 5 para este preço",
    );
  });

  it("dropdown da tabela abre por padrão e alterna aria-expanded", () => {
    mount();
    const toggle = document.querySelector(".pdp-tiers-toggle");
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    const panel = document.querySelector<HTMLElement>("#pdp-tiers-table");
    expect(toggle?.getAttribute("aria-controls")).toBe("pdp-tiers-table");
    expect(panel?.hidden).toBe(false);
    click(toggle);
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(panel?.hidden).toBe(true);
    click(toggle);
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
  });

  it("CTA mostra quantidade e total sem plural do nome da variação", () => {
    mount();
    const cta = () => norm(document.querySelector(".pdp-buy .primary")?.textContent);
    expect(cta()).toBe("Adicionar 1 ao carrinho · R$ 20,00");
    click(document.querySelector('[aria-label="Aumentar quantidade"]'));
    expect(cta()).toBe("Adicionar 2 ao carrinho · R$ 40,00");
    expect(document.querySelector(".pdp-qty label")?.textContent).toBe("Quantidade");
  });

  it("descrição longa começa recolhida e Ver mais expande", () => {
    mount({ description: "Texto longo. ".repeat(60) });
    const body = document.querySelector<HTMLElement>("#pdp-desc-body");
    const toggle = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Ver mais",
    );
    expect(body?.hasAttribute("data-open")).toBe(false);
    click(toggle ?? null);
    expect(body?.hasAttribute("data-open")).toBe(true);
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
  });
});
