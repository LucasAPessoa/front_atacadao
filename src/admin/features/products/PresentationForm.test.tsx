// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminProductDetail, Presentation } from "../../api/types";
import { adminTokens } from "../../auth/session";
import { waitFor } from "../../test-utils";
import { ToastProvider } from "../../ui/Toast";
import { PresentationForm, buildPatch } from "./PresentationForm";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const presentation = (extra: Partial<Presentation> = {}): Presentation => ({
  visible: true,
  featured: false,
  updated_at: null,
  updated_by: null,
  ...extra,
});

const product = (p: Presentation): AdminProductDetail => ({
  id: "p1",
  bling_id: 1,
  code: "A",
  name: "Nome Bling",
  description: null,
  complementary_description: null,
  images: [],
  categories: [],
  is_active: true,
  brand: null,
  unit: null,
  bling_updated_at: null,
  variants: [],
  presentation: p,
});

const memory = new Map<string, string>();
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
  patches = [];
  patchReply = () => new Response(JSON.stringify({ data: presentation() }), { status: 200 });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        patches.push(JSON.parse(String(init.body)));
        return patchReply();
      }
      return new Response("{}", { status: 200 });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

async function mount(p = presentation()) {
  const box = document.createElement("div");
  document.body.append(box);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  await act(async () => {
    createRoot(box).render(
      <QueryClientProvider client={client}>
        <ToastProvider>
          <PresentationForm product={product(p)} />
        </ToastProvider>
      </QueryClientProvider>,
    );
  });
  return { box, invalidate };
}

const save = (box: HTMLElement) =>
  act(async () => (box.querySelector("button[type=submit]") as HTMLButtonElement).click());
const check = (box: HTMLElement, label: string) =>
  act(async () => {
    const found = Array.from(box.querySelectorAll("label")).find((l) =>
      l.textContent?.includes(label),
    );
    found?.querySelector("input")?.click();
  });

describe("buildPatch", () => {
  it("envia só chaves alteradas", () => {
    const initial = { visible: true, featured: false };
    expect(buildPatch(initial, initial)).toEqual({});
    expect(buildPatch({ ...initial, featured: true }, initial)).toEqual({ featured: true });
  });
});

describe("PresentationForm", () => {
  it("só tem visibilidade e destaque, com a nota 'Edite no Bling'", async () => {
    const { box } = await mount();
    expect(box.querySelectorAll("input[type=checkbox]")).toHaveLength(2);
    expect(box.querySelector("input[type=text], textarea")).toBeNull();
    expect(box.textContent).toContain("Edite no Bling");
  });

  it("salva só o que mudou e recarrega o detalhe e a lista", async () => {
    const { box, invalidate } = await mount();
    await check(box, "Destaque");
    await save(box);
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]).toEqual({ featured: true });
    await waitFor(() => expect(box.textContent).toContain("Apresentação na loja salva."));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin", "product", "p1"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin", "products"] });
  });

  it("sem alteração não chama a API", async () => {
    const { box } = await mount();
    await save(box);
    await waitFor(() => expect(box.textContent).toContain("Nenhuma alteração"));
    expect(patches).toHaveLength(0);
  });

  it("erro do servidor aparece como aviso", async () => {
    patchReply = () => new Response(JSON.stringify({ detail: "x" }), { status: 500 });
    const { box } = await mount();
    await check(box, "Visível");
    await save(box);
    await waitFor(() => expect(box.textContent).toContain("Erro no servidor"));
  });
});
