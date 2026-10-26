// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminTokens } from "../../auth/session";
import type { AdminProductSummary } from "../../api/types";
import { ProductsList } from "./ProductsList";
import { formatBRL, formatPriceRange } from "./format";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const product = (n: number, extra: Partial<AdminProductSummary> = {}): AdminProductSummary => ({
  id: `id-${n}`,
  code: `COD-${n}`,
  name: `Produto ${n}`,
  bling_name: `Bling ${n}`,
  main_image_url: null,
  is_active: true,
  visible: true,
  featured: false,
  customized: false,
  min_price: "19.90",
  max_price: "1234.50",
  stock: 10,
  low_stock: false,
  pending_count: 0,
  updated_at: "2026-10-26T12:00:00Z",
  ...extra,
});

const memory = new Map<string, string>();
let urls: string[];
let reply: (url: string) => unknown;

beforeEach(() => {
  memory.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  });
  adminTokens.storeSession({ access_token: "a", refresh_token: "r", token_type: "bearer" });
  urls = [];
  reply = () => ({ data: [], meta: { total: 0, skip: 0, limit: 25 } });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      return new Response(JSON.stringify(reply(url)), { status: 200 });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

let search = "";
const Probe = () => {
  search = useLocation().search;
  return null;
};

async function mount(initial = "/produtos") {
  const box = document.createElement("div");
  document.body.append(box);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    createRoot(box).render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initial]}>
          <ProductsList />
          <Probe />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
  await settle(() => !box.querySelector("[role=status]") && productCalls().length > 0);
  await act(async () => new Promise((r) => setTimeout(r, 20)));
  return box;
}
const flush = () => act(async () => {});
const settle = async (check: () => unknown) => {
  for (let i = 0; i < 40; i++) {
    if (check()) return;
    await act(async () => new Promise((r) => setTimeout(r, 10)));
  }
};

const productCalls = () => urls.filter((u) => u.includes("/admin/products"));
const categoriesReply = (url: string) =>
  url.includes("/catalog/categories")
    ? { data: [{ id: "cat-1", name: "Bebidas", is_active: true }] }
    : null;

describe("formatação de dinheiro", () => {
  it("formata a partir da string", () => {
    expect(formatBRL("1234.5")).toBe("R$ 1.234,50");
    expect(formatBRL("0.99")).toBe("R$ 0,99");
    expect(formatPriceRange("10.00", "10.00")).toBe("R$ 10,00");
    expect(formatPriceRange("19.90", "24.90")).toBe("R$ 19,90 – R$ 24,90");
  });
});

describe("ProductsList", () => {
  it("lista com colunas, faixa de preço e total", async () => {
    reply = (url) =>
      categoriesReply(url) ?? {
        data: [product(1, { pending_count: 2, low_stock: true })],
        meta: { total: 1, skip: 0, limit: 25 },
      };
    const box = await mount();
    expect(box.textContent).toContain("Produto 1");
    expect(box.textContent).toContain("COD-1");
    expect(box.textContent).toContain("R$ 19,90 – R$ 1.234,50");
    expect(box.textContent).toContain("1 item");
    expect(box.textContent).toContain("Baixo");
  });

  it("restaura filtros da URL na consulta e nos controles", async () => {
    reply = (url) =>
      categoriesReply(url) ?? { data: [product(1)], meta: { total: 1, skip: 0, limit: 25 } };
    const box = await mount(
      "/produtos?q=cafe&visible=true&pending=false&sort=price&order=desc&skip=25",
    );
    const call = productCalls().at(-1) ?? "";
    for (const part of [
      "q=cafe",
      "visible=true",
      "pending=false",
      "sort=price",
      "order=desc",
      "skip=25",
    ])
      expect(call).toContain(part);
    expect((box.querySelector("#flt-visible") as HTMLSelectElement).value).toBe("true");
    expect((box.querySelector("input[type=search]") as HTMLInputElement).value).toBe("cafe");
  });

  it("filtro reflete na URL e volta à primeira página", async () => {
    reply = (url) =>
      categoriesReply(url) ?? { data: [product(1)], meta: { total: 80, skip: 0, limit: 25 } };
    const box = await mount("/produtos?skip=25");
    const select = box.querySelector("#flt-featured") as HTMLSelectElement;
    await act(async () => {
      select.value = "true";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(search).toBe("?featured=true");
    expect(productCalls().at(-1)).toContain("featured=true");
  });

  it("paginação avança com skip na URL", async () => {
    reply = (url) =>
      categoriesReply(url) ?? { data: [product(1)], meta: { total: 80, skip: 0, limit: 25 } };
    const box = await mount();
    expect(box.textContent).toContain("Página 1 de 4 · 80 itens");
    const next = Array.from(box.querySelectorAll("button")).find(
      (b) => b.textContent === "Próxima",
    );
    await act(async () => next?.click());
    expect(search).toBe("?skip=25");
    expect(productCalls().at(-1)).toContain("skip=25");
  });

  it("ordenar por coluna grava sort e order", async () => {
    reply = (url) =>
      categoriesReply(url) ?? { data: [product(1)], meta: { total: 1, skip: 0, limit: 25 } };
    const box = await mount();
    const price = Array.from(box.querySelectorAll("button.adm-sort")).find((b) =>
      b.textContent?.startsWith("Preço"),
    );
    await act(async () => (price as HTMLButtonElement).click());
    expect(search).toBe("?sort=price");
    await act(async () => (price as HTMLButtonElement).click());
    expect(search).toBe("?sort=price&order=desc");
  });

  it("vazio com filtros oferece limpar filtros", async () => {
    const box = await mount("/produtos?q=zzz&featured=true");
    expect(box.textContent).toContain("Nenhum produto encontrado");
    const clear = Array.from(box.querySelectorAll("button")).filter(
      (b) => b.textContent === "Limpar filtros",
    );
    expect(clear.length).toBeGreaterThan(0);
    await act(async () => clear.at(-1)?.click());
    await flush();
    expect(search).toBe("");
    expect((box.querySelector("input[type=search]") as HTMLInputElement).value).toBe("");
  });

  it("erro mostra mensagem e tenta novamente", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes("/catalog/categories")
          ? new Response(JSON.stringify({ data: [] }), { status: 200 })
          : new Response(JSON.stringify({ detail: "falhou" }), { status: 500 }),
      ),
    );
    const box = await mount();
    expect(box.querySelector("[role=alert]")?.textContent).toContain("Erro no servidor");
    expect(box.textContent).toContain("Tentar novamente");
  });
});
