import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Layout } from "../../components/Layout";
import type { Cart } from "../../shared/types/domain";
import { CartPage } from "./CartPage";

const cart = {
  total_items: 2,
  total_amount: "20.00",
  items: [
    {
      id: "i1",
      variant_id: "v1",
      quantity: 2,
      unit_price: "10.00",
      subtotal: "20.00",
      variant: { base_price: "10.00", variation_name: "Caixa" },
    },
  ],
} as unknown as Cart;

describe("carrinho no celular", () => {
  it("expõe quantidade, total e remover do item com rótulos acessíveis", () => {
    const html = renderToStaticMarkup(
      <CartPage
        token="t"
        cart={cart}
        addresses={[]}
        onAddresses={async () => {}}
        onCart={() => {}}
        onLogin={() => {}}
        onError={() => {}}
      />,
    );
    expect(html).toContain("Diminuir quantidade");
    expect(html).toContain("Aumentar quantidade");
    expect(html).toContain("Remover");
    expect(html).toContain("line-total");
    expect(html).toContain('aria-label="Itens do carrinho"');
    expect(html).toContain("R$");
    expect(html).not.toContain("<table");
  });

  it("cabeçalho tem ações com aria-label", () => {
    const html = renderToStaticMarkup(
      <Layout user={null} cartCount={3} onLogout={() => {}} path="/produtos">
        x
      </Layout>,
    );
    expect(html).toContain('aria-label="Entrar"');
    expect(html).toContain('aria-label="Carrinho, 3 itens"');
  });
});

describe("sem numeração decorativa (#64)", () => {
  it("etapas e título do carrinho sem colchetes nem zeros à esquerda", () => {
    const html = renderToStaticMarkup(
      <CartPage
        token="t"
        cart={cart}
        addresses={[]}
        onAddresses={async () => {}}
        onCart={() => {}}
        onLogin={() => {}}
        onError={() => {}}
      />,
    );
    expect(html).toContain('aria-current="step">Carrinho</li>');
    expect(html).toContain("<li>Pagamento</li>");
    expect(html).toContain("Seu carrinho");
    expect(html).toContain('<span class="title-count">2 itens</span>');
    expect(html).not.toMatch(/\[\d|0\d (Carrinho|Entrega|Pagamento)/);
  });

  it("contador do cabeçalho sem colchetes", () => {
    const html = renderToStaticMarkup(
      <Layout user={null} cartCount={3} onLogout={() => {}} path="/produtos">
        x
      </Layout>,
    );
    expect(html).toContain('<span class="cart-count" aria-hidden="true">· 3</span>');
    expect(html).not.toContain("[03]");
    const empty = renderToStaticMarkup(
      <Layout user={null} cartCount={0} onLogout={() => {}} path="/produtos">
        x
      </Layout>,
    );
    expect(empty).not.toContain("cart-count");
  });
});
