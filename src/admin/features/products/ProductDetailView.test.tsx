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
  name: "Nome Bling",
  description: "<p>Descrição <script>x</script>do Bling</p>",
  complementary_description: null,
  images: ["https://img/1.jpg"],
  categories: [{ id: "c1", name: "Bebidas" }],
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
      published: true,
      price_source: "variant_link",
      store_link: "own",
      store_price: "12.50",
      pricing_status: "confirmed",
      pricing_confirmed_at: null,
      pricing_tiers: [],
      warnings: [],
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
      published: true,
      price_source: "variant_link",
      store_link: "inherited",
      store_price: "13.00",
      pricing_status: "confirmed",
      pricing_confirmed_at: null,
      pricing_tiers: [],
      warnings: [],
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
      published: false,
      price_source: "variant_link",
      store_link: "none",
      store_price: "7.77",
      pricing_status: "confirmed",
      pricing_confirmed_at: null,
      pricing_tiers: [],
      warnings: [],
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
      published: true,
      price_source: "variant_link",
      store_link: "own",
      store_price: null,
      pricing_status: "confirmed",
      pricing_confirmed_at: null,
      pricing_tiers: [],
      warnings: [],
    },
  ],
  presentation: {
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

  it("mostra dados com o selo", () => {
    expect(html).toContain("vem do Bling");
    expect(html).toContain("Nome Bling");
    expect(html).toContain("Marca X");
    expect(html).toContain('src="https://img/1.jpg"');
  });

  it("mostra o vínculo de cada variação com a loja do site e o preço do vínculo", () => {
    expect(html).toContain("Loja do site");
    expect(html).toContain("Publicada (vínculo próprio)");
    expect(html).toContain("Publicada (herda do pai)");
    expect(html).toContain("Não publicada");
    expect(html).toContain("R$ 12,50 na loja");
    expect(html).toContain("R$ 13,00 na loja");
    // Sem vínculo, um store_price antigo não aparece.
    expect(html).not.toContain("7,77");
  });

  it("exibe variação fora de venda com o motivo traduzido", () => {
    expect(html).toContain("Cx 24");
    expect(html).toContain("Fora de venda");
    expect(html).toContain("Motivo: Sem peso");
    expect(html).toContain("Motivo: Sem medidas");
    expect(html).toContain("Motivo: Preço zero");
    expect(html).toContain("1.2 kg");
  });

  it("nome, descrição e categorias são só leitura, com a nota Edite no Bling", () => {
    expect(html).toContain("Bebidas");
    expect(html).toContain("<p>Descrição do Bling</p>");
    expect(html).not.toContain("<script");
    expect(html).toContain("edite no Bling");
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
          <ToastProvider>
            <MemoryRouter initialEntries={["/produtos/p1"]}>
              <Routes>
                <Route path="/produtos/:id" element={<ProductDetail />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
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
    await waitFor(() => expect(box.textContent).toContain("Nome Bling"));
    expect(box.textContent).toContain("vem do Bling");
  });

  it("salvar o preço de variação não publicada mostra Publicada na hora, com a resposta do PUT", async () => {
    const v3 = detail.variants[2];
    let gets = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "PUT") {
          const saved = {
            ...v3,
            store_link: "own",
            published: true,
            store_price: "30.00",
            pricing_tiers: [{ id: "t1", min_quantity: 1, unit_price: "30.00" }],
          };
          return new Response(JSON.stringify({ data: saved }), { status: 200 });
        }
        gets += 1;
        // O refetch depois de salvar não volta: o estado novo tem que vir da resposta do PUT.
        if (gets > 1) return new Promise<Response>(() => {});
        return new Response(JSON.stringify({ data: detail }), { status: 200 });
      }),
    );
    const box = await mount();
    // Form desconectado do documento não dispara submit.
    document.body.append(box);
    await waitFor(() => expect(box.textContent).toContain("Nome Bling"));
    const prices = [...box.querySelectorAll("[role=tab]")].find((t) => t.textContent === "Preços");
    await act(async () => (prices as HTMLElement).click());
    const form = () => box.querySelector<HTMLFormElement>('form[data-variant="v3"]');
    expect(form()?.textContent).toContain("Não publicada");
    expect(form()?.textContent).toContain("Salvar o preço publica esta variação na loja");
    const unit = form()?.querySelector<HTMLInputElement>("input") as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        unit,
        "30,00",
      );
      unit.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const submit = [...(form()?.querySelectorAll("button") ?? [])].find(
      (b) => b.textContent === "Salvar e confirmar",
    );
    await act(async () => (submit as HTMLElement).click());
    const confirm = [...document.querySelectorAll("[role=alertdialog] button")].find((b) =>
      b.textContent?.endsWith("e salvar"),
    );
    await act(async () => (confirm as HTMLElement).click());
    await waitFor(() => expect(form()?.textContent).toContain("Publicada (vínculo próprio)"));
    expect(form()?.textContent).toContain("R$ 30,00 na loja");
    expect(form()?.textContent).not.toContain("Salvar o preço publica");
    expect(form()?.textContent).not.toContain("Fora da loja do site");
    expect(gets).toBe(2);
    box.remove();
  });
});
