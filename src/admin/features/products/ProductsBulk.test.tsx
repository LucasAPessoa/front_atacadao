// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useNavigate } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminProductSummary } from "../../api/types";
import { adminTokens } from "../../auth/session";
import { waitFor } from "../../test-utils";
import { ToastProvider } from "../../ui/Toast";
import { ProductsList } from "./ProductsList";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const product = (n: number): AdminProductSummary => ({
  id: `id-${n}`,
  code: `COD-${n}`,
  name: `Produto ${n}`,
  bling_name: `Bling ${n}`,
  store_listed: true,
  pricing_status: "confirmed",
  warnings: [],
  main_image_url: null,
  is_active: true,
  visible: true,
  featured: false,
  customized: false,
  min_price: "10.00",
  max_price: "10.00",
  stock: 10,
  low_stock: false,
  pending_count: 0,
  updated_at: "2026-10-26T12:00:00Z",
});

const memory = new Map<string, string>();
let listCalls: number;
let patches: unknown[];
let patchReply: () => Response;

beforeEach(() => {
  memory.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  });
  adminTokens.storeSession({ access_token: "a", refresh_token: "r", token_type: "bearer" });
  listCalls = 0;
  urls = [];
  patches = [];
  patchReply = () => new Response(JSON.stringify({ data: { updated: 3 } }), { status: 200 });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "PATCH") {
        patches.push({ url, body: JSON.parse(String(init.body)) });
        return patchReply();
      }
      if (url.includes("/catalog/categories"))
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      listCalls++;
      urls.push(url);
      return new Response(
        JSON.stringify({
          data: [product(1), product(2), product(3)],
          meta: { total: 3, skip: 0, limit: 25 },
        }),
        { status: 200 },
      );
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

let navigate: ReturnType<typeof useNavigate>;
const Nav = () => {
  navigate = useNavigate();
  return null;
};
let urls: string[];

async function mount(initial = "/produtos") {
  const box = document.createElement("div");
  document.body.append(box);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    createRoot(box).render(
      <QueryClientProvider client={client}>
        <ToastProvider>
          <MemoryRouter initialEntries={[initial]}>
            <ProductsList />
            <Nav />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    );
  });
  await waitFor(() => expect(box.textContent).toContain("Produto 1"));
  return box;
}
const button = (box: HTMLElement, label: string) =>
  Array.from(box.querySelectorAll("button")).find((b) => b.textContent === label) as
    | HTMLButtonElement
    | undefined;
const click = (el: HTMLElement | undefined) => act(async () => el?.click());

describe("ações em lote", () => {
  it("confirma, envia PATCH em lote, mostra a quantidade e recarrega a lista", async () => {
    const box = await mount();
    expect(button(box, "Ocultar da loja")).toBeUndefined();
    await click(box.querySelector("input[aria-label='Selecionar todos']") as HTMLElement);
    await click(button(box, "Ocultar da loja"));
    expect(box.querySelector("[role=alertdialog]")?.textContent).toContain("Ocultar 3 produtos?");
    expect(patches).toHaveLength(0);
    const before = listCalls;
    await click(button(box, "Confirmar"));
    await waitFor(() => expect(box.textContent).toContain("3 produto(s) ocultado(s) da loja."));
    expect(patches).toEqual([
      {
        url: expect.stringContaining("/admin/products/presentation"),
        body: { product_ids: ["id-1", "id-2", "id-3"], visible: false },
      },
    ]);
    await waitFor(() => expect(listCalls).toBeGreaterThan(before));
    expect(box.querySelector("[role=toolbar]")).toBeNull();
  });

  it("cancelar não envia nada", async () => {
    const box = await mount();
    await click(box.querySelectorAll("input[aria-label='Selecionar linha']")[0] as HTMLElement);
    await click(button(box, "Destacar"));
    expect(box.querySelector("[role=alertdialog]")?.textContent).toContain("Destacar 1 produto?");
    await click(button(box, "Cancelar"));
    expect(box.querySelector("[role=alertdialog]")).toBeNull();
    expect(patches).toHaveLength(0);
  });

  it("404 mostra o detalhe do servidor e mantém a seleção", async () => {
    patchReply = () =>
      new Response(JSON.stringify({ detail: "Produtos não encontrados: id-2" }), { status: 404 });
    const box = await mount();
    await click(box.querySelector("input[aria-label='Selecionar todos']") as HTMLElement);
    await click(button(box, "Remover destaque"));
    await click(button(box, "Confirmar"));
    await waitFor(() => expect(box.textContent).toContain("Produtos não encontrados: id-2"));
    expect(box.querySelector("[role=toolbar]")).not.toBeNull();
  });

  it("voltar do navegador limpa a seleção", async () => {
    const box = await mount();
    await click(box.querySelector("input[aria-label='Selecionar todos']") as HTMLElement);
    expect(box.querySelector("[role=toolbar]")).not.toBeNull();
    await act(async () => void navigate("/produtos?skip=25"));
    await act(async () => void navigate(-1));
    expect(box.querySelector("[role=toolbar]")).toBeNull();
  });

  it("sort e order inválidos na URL caem no padrão", async () => {
    await mount("/produtos?sort=bogus&order=sideways");
    expect(urls.at(-1)).toContain("sort=name");
    expect(urls.at(-1)).toContain("order=asc");
    expect(urls.at(-1)).not.toContain("bogus");
  });
});
