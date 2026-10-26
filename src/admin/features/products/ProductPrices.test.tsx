// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminVariant } from "../../api/types";
import { adminTokens } from "../../auth/session";
import { waitFor } from "../../test-utils";
import { ToastProvider } from "../../ui/Toast";
import { PricingTiersEditor } from "./PricingTiersEditor";
import { VariantPriceEditor } from "./VariantPriceEditor";
import { normalizePrice } from "./price";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const variant = {
  id: "v1",
  bling_sku: "SKU1",
  variation_name: "Caixa",
  base_price: "10.00",
} as AdminVariant;

const memory = new Map<string, string>();
let calls: { method: string; url: string; body: unknown }[];
let reply: () => Response;

beforeEach(() => {
  memory.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  });
  adminTokens.storeSession({ access_token: "a", refresh_token: "r", token_type: "bearer" });
  calls = [];
  reply = () => new Response(JSON.stringify({ data: {} }), { status: 200 });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        method: init?.method ?? "GET",
        url: String(input),
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return reply();
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

async function mount(node: React.ReactNode) {
  const box = document.createElement("div");
  document.body.append(box);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    createRoot(box).render(
      <QueryClientProvider client={client}>
        <ToastProvider>{node}</ToastProvider>
      </QueryClientProvider>,
    );
  });
  return box;
}
const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement)?.click());
const type = (el: HTMLInputElement, value: string) =>
  act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
const byLabel = (box: HTMLElement, label: string) =>
  Array.from(box.querySelectorAll("button")).find(
    (b) => b.textContent === label || b.getAttribute("aria-label") === label,
  );
const submit = (box: HTMLElement) =>
  act(async () => box.querySelector<HTMLFormElement>("form")?.requestSubmit());

describe("normalizePrice", () => {
  it("aceita vírgula e normaliza para 2 casas", () => {
    expect(normalizePrice("19,90")).toBe("19.90");
    expect(normalizePrice("19.9")).toBe("19.90");
    expect(normalizePrice(" 5 ")).toBe("5.00");
    for (const bad of ["0", "0,00", "-1", "1,999", "abc", "", "1.234,50"])
      expect(normalizePrice(bad)).toBeNull();
  });
});

describe("VariantPriceEditor", () => {
  async function edit(value: string) {
    const box = await mount(<VariantPriceEditor productId="p1" variants={[variant]} />);
    await click(byLabel(box, "Editar preço de Caixa"));
    await type(box.querySelector("input") as HTMLInputElement, value);
    await submit(box);
    return box;
  }

  it.each(["0", "-5", "1,999", "abc"])("bloqueia %s no campo sem chamar a API", async (value) => {
    const box = await edit(value);
    await waitFor(() => expect(box.querySelector("[role=alert]")).not.toBeNull());
    expect(box.querySelector("input")?.getAttribute("aria-invalid")).toBe("true");
    expect(calls).toHaveLength(0);
  });

  it("aceita vírgula e envia string com ponto", async () => {
    const box = await edit("19,90");
    await waitFor(() => expect(box.textContent).toContain("R$ 10,00"));
    expect(calls[0]).toMatchObject({
      method: "PATCH",
      url: expect.stringContaining("/catalog/product-variants/v1"),
      body: { base_price: "19.90" },
    });
  });
});

describe("PricingTiersEditor", () => {
  const tiers = [{ id: "t1", min_quantity: 10, unit_price: "8.00" }];

  async function add(quantity: string, price: string) {
    const box = await mount(<PricingTiersEditor productId="p1" tiers={tiers} />);
    await click(byLabel(box, "Adicionar faixa"));
    const inputs = box.querySelectorAll("input");
    await type(inputs[0] as HTMLInputElement, quantity);
    await type(inputs[1] as HTMLInputElement, price);
    await submit(box);
    return box;
  }

  it("cria faixa enviando quantidade inteira e preço em string", async () => {
    await add("20", "7,50");
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({
      method: "POST",
      body: { product_id: "p1", min_quantity: 20, unit_price: "7.50" },
    });
  });

  it("recusa quantidade mínima duplicada no cliente", async () => {
    const box = await add("10", "7,50");
    await waitFor(() => expect(box.textContent).toContain("Já existe uma faixa"));
    expect(calls).toHaveLength(0);
  });

  it("recusa quantidade inválida e preço inválido", async () => {
    const box = await add("0", "0");
    await waitFor(() => expect(box.querySelectorAll("[role=alert]")).toHaveLength(2));
    expect(calls).toHaveLength(0);
  });

  it("mapeia 409 do servidor no campo de quantidade", async () => {
    reply = () =>
      new Response(JSON.stringify({ detail: "Faixa duplicada para o produto" }), { status: 409 });
    const box = await add("30", "7,00");
    await waitFor(() =>
      expect(box.querySelector("[role=alert]")?.textContent).toBe("Faixa duplicada para o produto"),
    );
  });

  it("remove só após confirmação", async () => {
    const box = await mount(<PricingTiersEditor productId="p1" tiers={tiers} />);
    await click(byLabel(box, "Remover faixa de 10 un."));
    expect(box.querySelector("[role=alertdialog]")).not.toBeNull();
    expect(calls).toHaveLength(0);
    await click(box.querySelector("[role=alertdialog] .adm-btn-danger"));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({
      method: "DELETE",
      url: expect.stringContaining("/catalog/pricing-tiers/t1"),
    });
  });
});
