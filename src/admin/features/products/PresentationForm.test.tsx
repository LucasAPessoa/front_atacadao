// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminProductDetail, Presentation } from "../../api/types";
import { adminTokens } from "../../auth/session";
import { waitFor } from "../../test-utils";
import { ToastProvider } from "../../ui/Toast";
import { PresentationForm, buildPatch, toFormValues } from "./PresentationForm";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const presentation = (extra: Partial<Presentation> = {}): Presentation => ({
  name: { bling: "Nome Bling", site: "Nome site", locked: true },
  description: {
    bling: "<p>Desc <script>alert(1)</script><b>Bling</b></p>",
    site: null,
    locked: false,
  },
  complementary_description: { bling: null, site: null, locked: false },
  categories: {
    bling: [{ id: "c1", name: "Bebidas" }],
    site: [{ id: "c2", name: "Promoções", is_active: false }],
    locked: true,
  },
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
  is_active: true,
  brand: null,
  unit: null,
  bling_updated_at: null,
  variants: [],
  pricing_tiers: [],
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
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/catalog/categories"))
        return new Response(
          JSON.stringify({
            data: [
              { id: "c1", name: "Bebidas", is_active: true },
              { id: "c2", name: "Promoções", is_active: false },
            ],
          }),
          { status: 200 },
        );
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
  await waitFor(() => expect(box.textContent).not.toContain("Carregando categorias"));
  return { box, invalidate };
}

const switchOf = (box: HTMLElement, legend: string) =>
  Array.from(box.querySelectorAll("fieldset"))
    .find((f) => f.querySelector("legend")?.textContent === legend)
    ?.querySelector("input[type=checkbox]") as HTMLInputElement;
const type = (el: HTMLInputElement | HTMLTextAreaElement, value: string) =>
  act(async () => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, "value")?.set?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
const save = (box: HTMLElement) =>
  act(async () => (box.querySelector("button[type=submit]") as HTMLButtonElement).click());

describe("buildPatch", () => {
  it("envia só chaves alteradas", () => {
    const initial = toFormValues(presentation());
    expect(buildPatch(initial, initial)).toEqual({});
    expect(buildPatch({ ...initial, featured: true }, initial)).toEqual({ featured: true });
  });
});

describe("PresentationForm", () => {
  it("mostra valor travado, valor do Bling e HTML sanitizado", async () => {
    const { box } = await mount();
    expect((box.querySelector("#pf-name-value") as HTMLInputElement).value).toBe("Nome site");
    expect(box.textContent).toContain("Nome Bling");
    expect(box.querySelector("script")).toBeNull();
    expect(box.querySelector("b")?.textContent).toBe("Bling");
    expect(box.textContent).toContain("Categoria inativa");
  });

  it("travar com valor envia locked:true e value aparado", async () => {
    const { box, invalidate } = await mount();
    await act(async () => switchOf(box, "Descrição").click());
    await type(box.querySelector("#pf-description-value") as HTMLTextAreaElement, "  Novo texto  ");
    await save(box);
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]).toEqual({ description: { locked: true, value: "Novo texto" } });
    await waitFor(() => expect(box.textContent).toContain("Apresentação na loja salva."));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin", "product", "p1"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin", "products"] });
  });

  it("destravar envia locked:false", async () => {
    const { box } = await mount();
    await act(async () => switchOf(box, "Nome").click());
    await save(box);
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]).toEqual({ name: { locked: false } });
  });

  it("valida vazio e mais de 255 caracteres sem chamar a API", async () => {
    const { box } = await mount();
    const name = box.querySelector("#pf-name-value") as HTMLInputElement;
    await type(name, "   ");
    await save(box);
    await waitFor(() => expect(box.textContent).toContain("Nome: informe um valor."));
    await type(name, "x".repeat(256));
    await save(box);
    await waitFor(() => expect(box.textContent).toContain("no máximo 255"));
    expect(patches).toHaveLength(0);
  });

  it("422 é mapeado para o campo", async () => {
    patchReply = () =>
      new Response(
        JSON.stringify({
          detail: [{ loc: ["body", "name", "value"], msg: "Nome já usado" }],
        }),
        { status: 422 },
      );
    const { box } = await mount();
    await type(box.querySelector("#pf-name-value") as HTMLInputElement, "Outro");
    await save(box);
    await waitFor(() =>
      expect(box.querySelector("#pf-name-value-error")?.textContent).toBe("Nome já usado"),
    );
  });

  it("400 vira erro do campo categorias", async () => {
    patchReply = () =>
      new Response(JSON.stringify({ detail: "Categoria inexistente" }), { status: 400 });
    const { box } = await mount();
    await act(async () => (box.querySelector("input[value=c1]") as HTMLInputElement).click());
    await save(box);
    await waitFor(() => expect(box.textContent).toContain("Categoria inexistente"));
  });
});
