// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminTokens } from "../../auth/session";
import { waitFor } from "../../test-utils";
import { ToastProvider } from "../../ui/Toast";
import { PricingSettingsPage } from "./PricingSettingsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const memory = new Map<string, string>();
let settings: { auto_confirm: boolean; store_configured: boolean; store_id: number | null };
let puts: unknown[];
let putStatus: number;

beforeEach(() => {
  memory.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  });
  adminTokens.storeSession({ access_token: "a", refresh_token: "r", token_type: "bearer" });
  settings = { auto_confirm: false, store_configured: true, store_id: 206347377 };
  puts = [];
  putStatus = 200;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") {
        puts.push(JSON.parse(String(init.body)));
        if (putStatus !== 200)
          return new Response(JSON.stringify({ detail: "falhou" }), { status: putStatus });
        settings = { ...settings, ...JSON.parse(String(init.body)) };
      }
      return new Response(JSON.stringify({ data: settings }), { status: 200 });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

async function mount() {
  const box = document.createElement("div");
  document.body.append(box);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    createRoot(box).render(
      <QueryClientProvider client={client}>
        <ToastProvider>
          <PricingSettingsPage />
        </ToastProvider>
      </QueryClientProvider>,
    );
  });
  await waitFor(() => expect(box.textContent).toContain("Confirmação automática de preços"));
  return box;
}
const toggle = (box: HTMLElement) => box.querySelector("input[type=checkbox]") as HTMLInputElement;

describe("configuração de preços", () => {
  it("mostra o interruptor e o ID da loja do site", async () => {
    const box = await mount();
    expect(toggle(box).checked).toBe(false);
    expect(box.textContent).toContain("206347377");
    expect(box.querySelector("h1")?.textContent).toBe("Configurações de preços");
    expect(box.textContent).toContain("os já pendentes continuam pendentes");
  });

  it("ligar envia PUT só com auto_confirm", async () => {
    const box = await mount();
    await act(async () => toggle(box).click());
    await waitFor(() => expect(toggle(box).checked).toBe(true));
    expect(puts).toEqual([{ auto_confirm: true }]);
  });

  it("loja não configurada aparece como aviso", async () => {
    settings = { auto_confirm: false, store_configured: false, store_id: null };
    const box = await mount();
    expect(box.textContent).toContain("Não configurada");
  });

  it("erro ao salvar mostra alerta e mantém o valor anterior", async () => {
    putStatus = 500;
    const box = await mount();
    await act(async () => toggle(box).click());
    await waitFor(() => expect(box.querySelector("[role=alert]")).not.toBeNull());
    expect(toggle(box).checked).toBe(false);
  });
});
