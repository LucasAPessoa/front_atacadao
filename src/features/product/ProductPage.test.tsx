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
      unit_price: "20.00",
      pricing_tiers: [
        { id: "t1", min_quantity: 1, unit_price: "20.00" },
        { id: "t2", min_quantity: 5, unit_price: "18.00" },
      ],
      stock_quantity: 3,
      is_active: true,
    },
    {
      id: "v2",
      variation_name: "Fardo 10kg",
      base_price: "38.00",
      unit_price: "38.00",
      pricing_tiers: [
        { id: "t3", min_quantity: 1, unit_price: "38.00" },
        { id: "t4", min_quantity: 2, unit_price: "35.00" },
      ],
      stock_quantity: 0,
      is_active: true,
    },
    {
      id: "v3",
      variation_name: "Fardo 20kg",
      base_price: "70.00",
      unit_price: "70.00",
      pricing_tiers: [{ id: "t5", min_quantity: 1, unit_price: "70.00" }],
      stock_quantity: 9,
      is_active: true,
    },
  ],
};
const extras = {
  images: [],
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
    expect(html.replace(/\u00a0/g, " ")).toContain("Adicionar 5 ao carrinho · R$ 90,00");
    expect(html).toContain("Máximo de 3 em estoque");
    expect(html).toContain('aria-live="polite"');
  });
  it("trocar a variação troca a tabela: faixas de uma variação não aparecem em outra", () => {
    const first = render("v1", 1);
    expect(first).toContain("5 ou mais");
    expect(first).toContain("18,00");
    expect(first).not.toContain("35,00");
    const second = render("v2", 1);
    expect(second).toContain("35,00");
    expect(second).toContain("2 ou mais");
    expect(second).not.toContain("18,00");
    // Variação só com a linha de 1 unidade não mostra tabela.
    expect(render("v3", 1)).not.toContain("Ver tabela de preços");
  });
  it("variação sem estoque fica indisponível e sem botão de adicionar", () => {
    const html = render("v2", 1);
    expect(html).toContain("Indisponível");
    expect(html).not.toContain("Adicionar ");
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
