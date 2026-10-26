// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BlingPendingItem } from "../../api/types";
import { adminTokens } from "../../auth/session";
import { waitFor } from "../../test-utils";
import { BlingPage } from "./BlingPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const items: BlingPendingItem[] = [
  {
    product_id: "p-1",
    product_name: "Café",
    variant_id: "v-1",
    bling_sku: "CAF-1",
    reason: "INCOMPLETE_WEIGHT",
  },
  {
    product_id: "p-2",
    product_name: "Açúcar",
    variant_id: "v-2",
    bling_sku: null,
    reason: "INCOMPLETE_DIMENSIONS",
  },
  {
    product_id: "p-3",
    product_name: "Sal",
    variant_id: "v-3",
    bling_sku: "SAL",
    reason: "INCOMPLETE_PRICE",
  },
];

const memory = new Map<string, string>();
let urls: string[];
let total = 3;

beforeEach(() => {
  memory.clear();
  total = 3;
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  });
  adminTokens.storeSession({ access_token: "a", refresh_token: "r", token_type: "bearer" });
  urls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      const body = url.includes("/admin/bling/pending")
        ? { data: items, meta: { total, skip: 0, limit: 20 } }
        : url.includes("catalog-sync/runs")
          ? { data: { current: null, items: [] } }
          : url.includes("/integrations/bling/status")
            ? { data: { status: "DISCONNECTED", recent_events: [] } }
            : { data: {} };
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

let search = "";
const Probe = () => {
  search = useLocation().search;
  return null;
};

async function mount(initial: string) {
  const box = document.createElement("div");
  document.body.append(box);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    createRoot(box).render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initial]}>
          <Routes>
            <Route path="/integracoes/bling" element={<BlingPage />} />
          </Routes>
          <Probe />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
  return box;
}
const findButton = (box: HTMLElement, text: string) =>
  [...box.querySelectorAll("button")].find((b) => b.textContent === text);
const pendingCalls = () => urls.filter((u) => u.includes("/admin/bling/pending"));

describe("pendências do Bling", () => {
  it("traduz motivos, mostra SKU ausente, link do produto e a nota", async () => {
    const box = await mount("/integracoes/bling?aba=pendencias");
    await waitFor(() => expect(box.textContent).toContain("Café"));
    const text = box.textContent ?? "";
    for (const label of ["Sem peso", "Sem medidas", "Preço zero"]) expect(text).toContain(label);
    expect(text).toContain("CAF-1");
    expect(box.querySelectorAll("tbody tr")[1]?.textContent).toContain("—");
    expect(box.querySelector('a[href="/produtos/p-1"]')?.textContent).toBe("Café");
    expect(text).toContain("variação inativa no Bling");
  });

  it("filtro por motivo vai para a URL e para a API", async () => {
    const box = await mount("/integracoes/bling?aba=pendencias");
    await waitFor(() => expect(box.textContent).toContain("Café"));
    const select = box.querySelector("#bling-pending-reason") as HTMLSelectElement;
    await act(async () => {
      select.value = "INCOMPLETE_PRICE";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await waitFor(() => expect(pendingCalls().at(-1)).toContain("reason=INCOMPLETE_PRICE"));
    expect(search).toContain("motivo=INCOMPLETE_PRICE");
  });

  it("paginação grava skip na URL e consulta a próxima página", async () => {
    total = 45;
    const box = await mount("/integracoes/bling?aba=pendencias");
    await waitFor(() => expect(box.textContent).toContain("Página 1 de 3"));
    await act(async () => {
      findButton(box, "Próxima")?.click();
    });
    await waitFor(() => expect(pendingCalls().at(-1)).toContain("skip=20"));
    expect(search).toContain("skip=20");
  });

  it("convive com o retorno OAuth e a aba de conexão", async () => {
    const box = await mount("/integracoes/bling?resultado=conectado");
    expect(findButton(box, "Pendências")).toBeTruthy();
    expect(pendingCalls()).toHaveLength(0);
    await act(async () => {
      findButton(box, "Pendências")?.click();
    });
    await waitFor(() => expect(pendingCalls().length).toBeGreaterThan(0));
    expect(search).toContain("aba=pendencias");
  });
});
