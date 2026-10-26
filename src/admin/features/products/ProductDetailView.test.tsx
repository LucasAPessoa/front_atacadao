// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminProductDetail } from "../../api/types";
import { adminTokens } from "../../auth/session";
import { waitFor } from "../../test-utils";
import { ToastProvider } from "../../ui/Toast";
import { ProductDetail } from "./ProductDetail";
import { ProductDetailView } from "./ProductDetailView";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const detail: AdminProductDetail = {
  id: "p1",
  bling_id: 123,
  code: "ABC-1",
  is_active: true,
  brand: "Marca X",
  unit: "UN",
  bling_updated_at: "2026-10-26T12:00:00Z",
  variants: [
    {
      id: "v1",
      bling_sku: "SKU1",
      gtin: "789",
      variation_name: "Cx 12",
      base_price: "19.90",
      stock_quantity: 10,
      is_active: true,
      weight_kg: 1.2,
      height_cm: 10,
      width_cm: 20,
      length_cm: 30,
      pending_reason: null,
      images: ["https://img/1.jpg"],
    },
    {
      id: "v2",
      bling_sku: "SKU2",
      gtin: null,
      variation_name: "Cx 24",
      base_price: "0.00",
      stock_quantity: 0,
      is_active: false,
      weight_kg: null,
      height_cm: null,
      width_cm: null,
      length_cm: null,
      pending_reason: "INCOMPLETE_WEIGHT",
      images: [],
    },
    {
      id: "v3",
      bling_sku: "SKU3",
      gtin: null,
      variation_name: "Cx 36",
      base_price: "0.00",
      stock_quantity: 0,
      is_active: false,
      weight_kg: 1,
      height_cm: null,
      width_cm: null,
      length_cm: null,
      pending_reason: "INCOMPLETE_DIMENSIONS",
      images: [],
    },
    {
      id: "v4",
      bling_sku: "SKU4",
      gtin: null,
      variation_name: "Cx 48",
      base_price: "0.00",
      stock_quantity: 0,
      is_active: false,
      weight_kg: 1,
      height_cm: 1,
      width_cm: 1,
      length_cm: 1,
      pending_reason: "INCOMPLETE_PRICE",
      images: [],
    },
  ],
  pricing_tiers: [{ id: "t1", min_quantity: 10, unit_price: "17.90" }],
  presentation: {
    name: { bling: "Nome Bling", site: "Nome site", locked: true },
    description: { bling: "<p>x</p>", site: null, locked: false },
    complementary_description: { bling: null, site: null, locked: false },
    categories: { bling: [], site: [], locked: false },
    visible: true,
    featured: false,
    updated_at: null,
    updated_by: null,
  },
};

describe("ProductDetailView (aba Bling)", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <ProductDetailView product={detail} />
    </MemoryRouter>,
  );

  it("mostra dados com o selo e as faixas de preço", () => {
    expect(html).toContain("vem do Bling");
    expect(html).toContain("Nome Bling");
    expect(html).toContain("Marca X");
    expect(html).toContain("A partir de 10 un.: R$ 17,90");
    expect(html).toContain('src="https://img/1.jpg"');
  });

  it("exibe variação fora de venda com o motivo traduzido", () => {
    expect(html).toContain("Cx 24");
    expect(html).toContain("Fora de venda");
    expect(html).toContain("Motivo: Sem peso");
    expect(html).toContain("Motivo: Sem medidas");
    expect(html).toContain("Motivo: Preço zero");
    expect(html).toContain("1.2 kg");
  });

  it("não tem campos editáveis", () => {
    expect(html).not.toMatch(/<(input|textarea|select)\b/);
  });

  it("aba Loja mostra o formulário de apresentação", () => {
    const box = document.createElement("div");
    act(() =>
      createRoot(box).render(
        <QueryClientProvider client={new QueryClient()}>
          <ToastProvider>
            <MemoryRouter>
              <ProductDetailView product={detail} />
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>,
      ),
    );
    const store = Array.from(box.querySelectorAll("[role=tab]")).find(
      (t) => t.textContent === "Loja",
    );
    act(() => (store as HTMLElement).click());
    expect(box.querySelector("form[aria-label=Loja]")).not.toBeNull();
    expect(box.textContent).toContain("Visível na loja");
  });
});

describe("ProductDetail (container)", () => {
  const memory = new Map<string, string>();
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
      removeItem: (k: string) => void memory.delete(k),
    });
    adminTokens.storeSession({ access_token: "a", refresh_token: "r", token_type: "bearer" });
  });
  afterEach(() => vi.unstubAllGlobals());

  const mount = async () => {
    const box = document.createElement("div");
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await act(async () => {
      createRoot(box).render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={["/produtos/p1"]}>
            <Routes>
              <Route path="/produtos/:id" element={<ProductDetail />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });
    return box;
  };

  it("404 mostra produto não encontrado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ detail: "Produto não encontrado" }), { status: 404 }),
      ),
    );
    const box = await mount();
    await waitFor(() => expect(box.textContent).toContain("Produto não encontrado"));
  });

  it("200 renderiza o detalhe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ data: detail }), { status: 200 })),
    );
    const box = await mount();
    await waitFor(() => expect(box.textContent).toContain("Nome site"));
    expect(box.textContent).toContain("vem do Bling");
  });
});
