import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Product } from "../../shared/types/domain";
import { ProductStateView, ProductView } from "./ProductPage";

const product: Product = {
  id: "p1",
  name: "Arroz Tipo 1",
  brand: "Marca",
  description: "Grãos selecionados",
  is_active: true,
  categories: [{ id: "c", name: "Grãos", is_active: true }],
  variants: [
    {
      id: "v1",
      variation_name: "Fardo 5kg",
      base_price: "20.00",
      stock_quantity: 3,
      is_active: true,
    },
    {
      id: "v2",
      variation_name: "Fardo 10kg",
      base_price: "38.00",
      stock_quantity: 0,
      is_active: true,
    },
  ],
};
const extras = {
  images: [],
  tiers: [
    { id: "t1", product_id: "p1", min_quantity: 1, unit_price: "20.00" },
    { id: "t2", product_id: "p1", min_quantity: 5, unit_price: "18.00" },
  ],
  reviews: [{ id: "r", product_id: "p1", rating: 4, comment: "Ótimo", is_approved: true }],
  questions: [{ id: "q", product_id: "p1", question_text: "Rende?", answer_text: "Sim" }],
};
const render = (variantId: string, quantity: number, overrides = {}) =>
  renderToStaticMarkup(
    <ProductView
      product={product}
      extras={{ ...extras, ...overrides }}
      variantId={variantId}
      quantity={quantity}
      imageId=""
      adding={false}
      message=""
      onVariant={() => {}}
      onQuantity={() => {}}
      onImage={() => {}}
      onAdd={() => {}}
    />,
  );

describe("página de produto", () => {
  it("mostra conteúdo, placeholder sem imagem e destaca a faixa da quantidade", () => {
    const html = render("v1", 5);
    expect(html).toContain("Arroz Tipo 1");
    expect(html).toContain("Grãos selecionados");
    expect(html).toContain("AR");
    expect(html).toContain("seu preço");
    expect(html).toContain("Nota 4 de 5");
    expect(html).toContain("Sim");
    expect(html).toContain("Adicionar ao carrinho");
    expect(html).toContain('aria-live="polite"');
  });
  it("variação sem estoque fica indisponível e sem botão de adicionar", () => {
    const html = render("v2", 1);
    expect(html).toContain("Indisponível");
    expect(html).not.toContain("Adicionar ao carrinho");
  });
  it("falha nas avaliações mostra aviso sem derrubar a página", () => {
    expect(render("v1", 1, { reviews: null })).toContain("Não foi possível carregar as avaliações");
  });
  it("estados 404, erro e carregando", () => {
    const notFound = renderToStaticMarkup(<ProductStateView kind="not-found" />);
    expect(notFound).toContain("404");
    expect(notFound).toContain("Voltar ao catálogo");
    expect(notFound).not.toContain("Tentar novamente");
    const error = renderToStaticMarkup(<ProductStateView kind="error" />);
    expect(error).toContain("Tentar novamente");
    expect(error).toContain('role="alert"');
    expect(renderToStaticMarkup(<ProductStateView kind="loading" />)).toContain("Carregando");
  });
});
