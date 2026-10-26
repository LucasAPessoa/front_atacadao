// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ModerationQuestion, ModerationReview } from "../../api/types";
import { adminTokens } from "../../auth/session";
import { waitFor } from "../../test-utils";
import { ToastProvider } from "../../ui/Toast";
import { ModerationPage } from "./ModerationPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const review: ModerationReview = {
  id: "r-1",
  rating: 4,
  comment: "Muito bom",
  is_approved: false,
  created_at: "2026-10-26T12:00:00Z",
  product: { id: "p-1", name: "Café" },
  author: { id: "u-1", full_name: "Maria Souza" },
};
const question: ModerationQuestion = {
  id: "q-1",
  question_text: "Tem versão sem glúten?",
  answer_text: null,
  created_at: "2026-10-26T12:00:00Z",
  product: { id: "p-1", name: "Café" },
  author: { id: "u-1", full_name: "Maria Souza" },
};

const memory = new Map<string, string>();
let calls: { url: string; method: string; body: string }[];
let respond: (url: string, method: string) => { status: number; body: unknown };

beforeEach(() => {
  memory.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  });
  adminTokens.storeSession({ access_token: "a", refresh_token: "r", token_type: "bearer" });
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({ url, method, body: String(init?.body ?? "") });
      const { status, body } = respond(url, method);
      return new Response(status === 204 ? null : JSON.stringify(body), { status });
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
        <ToastProvider>
          <MemoryRouter initialEntries={[initial]}>
            <Routes>
              <Route path="/moderacao" element={<ModerationPage />} />
            </Routes>
            <Probe />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    );
  });
  return box;
}
const click = async (el: Element | null | undefined) => {
  await act(async () => {
    (el as HTMLElement).click();
  });
};
const findButton = (box: HTMLElement, text: string) =>
  [...box.querySelectorAll("button")].find((b) => b.textContent === text);
const page = (data: unknown[]) => ({
  status: 200,
  body: { data, meta: { total: data.length, skip: 0, limit: 20 } },
});

describe("avaliações", () => {
  it("aprovar remove da fila pendente e invalida a lista", async () => {
    let approved = false;
    respond = (_url, method) => {
      if (method === "PATCH") {
        approved = true;
        return { status: 200, body: { data: {} } };
      }
      return page(approved ? [] : [review]);
    };
    const box = await mount("/moderacao");
    await waitFor(() => expect(box.textContent).toContain("Muito bom"));
    expect(calls[0]?.url).toContain("status=pending");
    expect(box.querySelector('a[href="/produtos/p-1"]')?.textContent).toBe("Café");
    expect(box.textContent).toContain("Maria Souza");
    await click(findButton(box, "Aprovar"));
    await waitFor(() => expect(box.textContent).toContain("Nenhuma avaliação"));
    const patch = calls.find((c) => c.method === "PATCH");
    expect(patch?.url).toContain("/catalog/product-reviews/r-1");
    expect(JSON.parse(patch?.body ?? "{}")).toEqual({ is_approved: true });
    expect(box.textContent).toContain("Avaliação aprovada.");
  });

  it("aprovada oferece Ocultar", async () => {
    respond = () => page([{ ...review, is_approved: true }]);
    const box = await mount("/moderacao?status=approved");
    await waitFor(() => expect(findButton(box, "Ocultar")).toBeTruthy());
    expect(findButton(box, "Aprovar")).toBeUndefined();
  });

  it("excluir pede confirmação antes de chamar a API", async () => {
    respond = (_url, method) =>
      method === "DELETE" ? { status: 204, body: null } : page([review]);
    const box = await mount("/moderacao");
    await waitFor(() => expect(findButton(box, "Excluir")).toBeTruthy());
    await click(findButton(box, "Excluir"));
    expect(box.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await click(findButton(box, "Cancelar"));
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await click(findButton(box, "Excluir"));
    const confirm = [...box.querySelectorAll('[role="alertdialog"] button')].find(
      (b) => b.textContent === "Excluir",
    );
    await click(confirm);
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE")).toBe(true));
  });

  it("aba e status ficam na URL", async () => {
    respond = () => page([]);
    const box = await mount("/moderacao");
    await waitFor(() => expect(box.textContent).toContain("Nenhuma avaliação"));
    await click(
      [...box.querySelectorAll('[role="tab"]')].find((t) => t.textContent === "Perguntas"),
    );
    expect(search).toContain("aba=perguntas");
    await waitFor(() => expect(calls.at(-1)?.url).toContain("/admin/moderation/questions"));
    expect(calls.at(-1)?.url).toContain("status=unanswered");
  });
});

describe("perguntas", () => {
  it("resposta vazia é bloqueada sem chamar a API", async () => {
    respond = () => page([question]);
    const box = await mount("/moderacao?aba=perguntas");
    await waitFor(() => expect(box.textContent).toContain("Tem versão sem glúten?"));
    const area = box.querySelector("textarea") as HTMLTextAreaElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setter?.call(area, "   ");
      area.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click(findButton(box, "Salvar resposta"));
    await waitFor(() => expect(box.textContent).toContain("Escreva a resposta"));
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });

  it("salva a resposta aparada e invalida a fila", async () => {
    let answered = false;
    respond = (_url, method) => {
      if (method === "PATCH") {
        answered = true;
        return { status: 200, body: { data: {} } };
      }
      return page(answered ? [] : [question]);
    };
    const box = await mount("/moderacao?aba=perguntas");
    await waitFor(() => expect(box.querySelector("textarea")).not.toBeNull());
    const area = box.querySelector("textarea") as HTMLTextAreaElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setter?.call(area, "  Sim, temos.  ");
      area.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click(findButton(box, "Salvar resposta"));
    await waitFor(() => expect(box.textContent).toContain("Nenhuma pergunta"));
    const patch = calls.find((c) => c.method === "PATCH");
    expect(patch?.url).toContain("/catalog/product-questions/q-1");
    expect(JSON.parse(patch?.body ?? "{}")).toEqual({ answer_text: "Sim, temos." });
  });

  it("pergunta respondida permite editar e excluir com confirmação", async () => {
    respond = () => page([{ ...question, answer_text: "Sim." }]);
    const box = await mount("/moderacao?aba=perguntas&status=answered");
    await waitFor(() => expect(findButton(box, "Editar resposta")).toBeTruthy());
    await click(findButton(box, "Editar resposta"));
    expect((box.querySelector("textarea") as HTMLTextAreaElement).value).toBe("Sim.");
    await click(findButton(box, "Cancelar"));
    await click(findButton(box, "Excluir"));
    expect(box.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  });
});

describe("correções de moderação", () => {
  it("excluir o último item de uma página > 1 volta à página anterior", async () => {
    let deleted = false;
    respond = (url, method) => {
      if (method === "DELETE") {
        deleted = true;
        return { status: 204, body: null };
      }
      const empty = deleted && url.includes("skip=20");
      return {
        status: 200,
        body: {
          data: empty ? [] : [review],
          meta: { total: empty ? 20 : 21, skip: 20, limit: 20 },
        },
      };
    };
    const box = await mount("/moderacao?skip=20");
    await waitFor(() => expect(findButton(box, "Excluir")).toBeTruthy());
    await click(findButton(box, "Excluir"));
    const confirm = [...box.querySelectorAll('[role="alertdialog"] button')].find(
      (b) => b.textContent === "Excluir",
    );
    await click(confirm);
    await waitFor(() => expect(search).not.toContain("skip=20"));
  });

  it("erro do servidor fica em alerta persistente", async () => {
    respond = (_url, method) =>
      method === "PATCH"
        ? { status: 409, body: { detail: "Avaliação já removida" } }
        : page([review]);
    const box = await mount("/moderacao");
    await waitFor(() => expect(findButton(box, "Aprovar")).toBeTruthy());
    await click(findButton(box, "Aprovar"));
    await waitFor(() =>
      expect(box.querySelector('[role="alert"]')?.textContent).toContain("O estado mudou"),
    );
  });
});
