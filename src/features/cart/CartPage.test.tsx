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
    for (const role of ["table", "rowgroup", "row", "columnheader", "cell"])
      expect(html).toContain(`role="${role}"`);
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
