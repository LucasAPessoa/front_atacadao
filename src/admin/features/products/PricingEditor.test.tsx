// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminProductDetail, AdminVariant } from "../../api/types";
import { adminTokens } from "../../auth/session";
import { waitFor } from "../../test-utils";
import { ToastProvider } from "../../ui/Toast";
import { PricingTab } from "./PricingEditor";
import { validatePricing } from "./pricing";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const variant = (extra: Partial<AdminVariant> = {}): AdminVariant =>
  ({
    id: "v1",
    bling_sku: "S",
    variation_name: "Pacote 5kg",
    published: true,
    price_source: "variant_link",
    store_price: "27.90",
    pricing_status: "confirmed",
    pricing_confirmed_at: null,
    pricing_tiers: [
      { id: "a", min_quantity: 1, unit_price: "27.90" },
      { id: "b", min_quantity: 10, unit_price: "25.90" },
    ],
    warnings: [],
    images: [],
    ...extra,
  }) as AdminVariant;
const product = (variants: AdminVariant[]) => ({ id: "p1", variants }) as AdminProductDetail;

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
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

async function mount(variants: AdminVariant[]) {
  const box = document.createElement("div");
  document.body.append(box);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    createRoot(box).render(
      <QueryClientProvider client={client}>
        <ToastProvider>
          <PricingTab product={product(variants)} />
        </ToastProvider>
      </QueryClientProvider>,
    );
  });
  return box;
}
// "Preço da faixa 1" / "Quantidade mínima da faixa 1": campo dentro do grupo "Faixa N" com rótulo visível.
const input = (box: HTMLElement, label: string) => {
  const n = label.match(/faixa (\d+)$/)?.[1];
  const text = label.startsWith("Preço") ? "Preço (R$)" : "A partir de (un.)";
  const group = box.querySelector(`[role=group][aria-label="Faixa ${n}"]`);
  const field = [...(group?.querySelectorAll("label") ?? [])].find((l) => l.textContent === text);
  return field?.parentElement?.querySelector("input") as HTMLInputElement;
};
const unitInput = (box: HTMLElement) =>
  [...box.querySelectorAll("label")]
    .find((l) => l.textContent === "Preço de 1 unidade (R$)")
    ?.parentElement?.querySelector("input") as HTMLInputElement;
const type = (el: HTMLInputElement, value: string) =>
  act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
const button = (box: HTMLElement, label: string) =>
  [...box.querySelectorAll("button")].find((b) => b.textContent === label) as HTMLButtonElement;
const click = (el: HTMLElement) => act(async () => el.click());
const saves = () => calls.filter((c) => c.method === "PUT");

describe("validatePricing", () => {
  const tier = (min: string, price: string) => ({ key: min, min, price });
  it("aceita tabela válida e ordena as faixas", () => {
    const { input: out, errors } = validatePricing("27,90", [
      tier("20", "24"),
      tier("10", "25,90"),
    ]);
    expect(errors).toEqual([]);
    expect(out).toEqual({
      unit_price: "27.90",
      tiers: [
        { min_quantity: 10, unit_price: "25.90" },
        { min_quantity: 20, unit_price: "24.00" },
      ],
    });
  });
  it("rejeita mínima < 2, repetida e preço não menor que o de 1 unidade", () => {
    const check = validatePricing("10", [
      tier("1", "5"),
      tier("5", "5"),
      tier("5", "4"),
      tier("6", "10"),
    ]);
    expect(check.input).toBeNull();
    expect(check.errors.join(" ")).toContain("a partir de 2");
    expect(check.errors.join(" ")).toContain("já existe uma faixa a partir de 5");
    expect(check.errors.join(" ")).toContain("menor que o de 1 unidade");
  });
});

describe("editor da tabela por variação", () => {
  it("mostra origem, estado, linha de 1 unidade, faixas e avisos", async () => {
    const box = await mount([
      variant({
        price_source: "general",
        pricing_status: "pending",
        warnings: ["tier_not_below_unit"],
      }),
    ]);
    expect(box.textContent).toContain("Preço geral do Bling (sem preço da loja)");
    expect(box.textContent).toContain("Aguardando preços");
    expect(box.textContent).toContain("Há faixa com preço igual ou maior");
    expect(unitInput(box).value).toBe("27,90");
    expect(input(box, "Quantidade mínima da faixa 1").value).toBe("10");
    expect(input(box, "Preço da faixa 1").value).toBe("25,90");
  });

  it("não envia com faixa inválida e mostra os erros", async () => {
    const box = await mount([variant()]);
    await type(input(box, "Preço da faixa 1"), "30");
    await click(button(box, "Salvar e confirmar"));
    expect(box.querySelector("[role=alert]")?.textContent).toContain("menor que o de 1 unidade");
    expect(saves()).toHaveLength(0);
  });

  it("linha 1 inalterada salva direto, só com as faixas", async () => {
    const box = await mount([variant()]);
    await type(input(box, "Preço da faixa 1"), "24,90");
    await click(button(box, "Salvar e confirmar"));
    await waitFor(() => expect(saves()).toHaveLength(1));
    expect(box.querySelector("[role=alertdialog]")).toBeNull();
    expect(saves()[0]?.url).toContain("/admin/products/p1/variants/v1/pricing");
    expect(saves()[0]?.body).toEqual({
      unit_price: "27.90",
      tiers: [{ min_quantity: 10, unit_price: "24.90" }],
    });
  });

  it("linha 1 alterada pede confirmação sobre o Bling antes de gravar", async () => {
    const box = await mount([variant()]);
    await type(unitInput(box), "28,90");
    await click(button(box, "Salvar e confirmar"));
    const dialog = box.querySelector("[role=alertdialog]");
    expect(dialog?.textContent).toContain("Alterar o preço no Bling?");
    expect(dialog?.textContent?.replace(/\s/g, " ")).toContain("De R$ 27,90 para R$ 28,90");
    const described = dialog?.getAttribute("aria-describedby");
    expect(described && document.getElementById(described)?.textContent).toContain("De R$");
    expect(saves()).toHaveLength(0);
    await click(button(box, "Cancelar"));
    expect(saves()).toHaveLength(0);
    await click(button(box, "Salvar e confirmar"));
    await click(button(box, "Alterar e salvar"));
    await waitFor(() => expect(saves()).toHaveLength(1));
    expect(saves()[0]?.body).toMatchObject({ unit_price: "28.90" });
  });

  for (const [status, detail] of [
    [422, "Já existe uma faixa a partir de 10 unidades nesta variação."],
    [409, "A conexão com o Bling não tem permissão para alterar preços."],
    [502, "O Bling não aceitou o novo preço: x. Nada foi alterado no site."],
  ] as const)
    it(`${status} mostra a mensagem do back`, async () => {
      reply = () => new Response(JSON.stringify({ detail }), { status });
      const box = await mount([variant()]);
      await type(input(box, "Preço da faixa 1"), "24,90");
      await click(button(box, "Salvar e confirmar"));
      await waitFor(() => expect(box.querySelector("[role=alert]")?.textContent).toBe(detail));
    });

  it("422 do pydantic (detail em lista) mostra as mensagens dos campos", async () => {
    reply = () =>
      new Response(
        JSON.stringify({
          detail: [{ loc: ["body", "tiers", 0, "unit_price"], msg: "Preço inválido." }],
        }),
        { status: 422 },
      );
    const box = await mount([variant()]);
    await type(input(box, "Preço da faixa 1"), "24,90");
    await click(button(box, "Salvar e confirmar"));
    await waitFor(() =>
      expect(box.querySelector("[role=alert]")?.textContent).toBe("Preço inválido."),
    );
  });

  it("Confirmar preços usa confirm-pricing do produto e só vale com variação pendente", async () => {
    const box = await mount([variant()]);
    expect(button(box, "Confirmar preços").disabled).toBe(true);
    document.body.innerHTML = "";
    const pending = await mount([variant({ pricing_status: "pending" })]);
    await click(button(pending, "Confirmar preços"));
    await waitFor(() => expect(calls.some((c) => c.method === "POST")).toBe(true));
    expect(calls.find((c) => c.method === "POST")?.url).toContain(
      "/admin/products/p1/confirm-pricing",
    );
  });

  it("variação pendente sem preço mostra origem, instrução e define o preço no diálogo", async () => {
    const box = await mount([
      variant({
        pricing_status: "pending",
        price_source: null,
        store_price: null,
        pricing_tiers: [],
        warnings: ["price_not_set"],
      }),
    ]);
    expect(box.textContent).toContain("Sem preço definido no Bling");
    expect(box.textContent).toContain("Informe o preço de 1 unidade e salve para liberar na loja.");
    await type(unitInput(box), "30,00");
    await click(button(box, "Salvar e confirmar"));
    expect(box.querySelector("[role=alertdialog]")?.textContent).toContain(
      "Definir preço no Bling?",
    );
  });

  it("Confirmar preços desabilitado explica o motivo", async () => {
    const box = await mount([variant()]);
    const confirm = button(box, "Confirmar preços");
    expect(confirm.disabled).toBe(true);
    const hint = document.getElementById(confirm.getAttribute("aria-describedby") ?? "");
    expect(hint?.textContent).toBe("Nenhuma variação publicada aguardando confirmação.");
  });

  it("faixas têm rótulos visíveis e só há um botão primário na aba", async () => {
    const box = await mount([variant()]);
    const group = box.querySelector("[role=group][aria-label='Faixa 1']");
    expect(group?.textContent).toContain("A partir de (un.)");
    expect(group?.textContent).toContain("Preço (R$)");
    expect(box.querySelectorAll(".adm-btn-primary")).toHaveLength(1);
  });
});
