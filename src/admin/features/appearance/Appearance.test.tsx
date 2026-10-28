// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../shared/http";
import { adminApi } from "../../api";
import { waitFor } from "../../test-utils";
import { AppearancePage } from "./AppearancePage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const themes = [
  { key: "gondola", name: "Gôndola", description: "Visual de prateleira." },
  { key: "feira", name: "Feira", description: "Visual de feira." },
];
const settings = { theme: "gondola", brand_color: "#1D6B57", updated_at: null };

let root: ReturnType<typeof createRoot> | undefined;
async function mount() {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () =>
    root?.render(
      <QueryClientProvider client={client}>
        <AppearancePage />
      </QueryClientProvider>,
    ),
  );
  await waitFor(() => expect(document.querySelector("form")).not.toBeNull());
}
const hex = () => document.getElementById("cor-marca-hex") as HTMLInputElement;
const button = (text: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent === text) as HTMLButtonElement;
const type = (input: HTMLInputElement, value: string) =>
  act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(adminApi, "getThemes").mockResolvedValue(themes);
  vi.spyOn(adminApi, "getStoreTheme").mockResolvedValue(settings);
});
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

describe("página Aparência", () => {
  it("carrega temas, marca o atual e preenche a cor", async () => {
    await mount();
    const radios = [...document.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(radios).toHaveLength(2);
    expect(radios[0].checked).toBe(true);
    expect(document.querySelector("fieldset legend")?.textContent).toBe("Tema da loja");
    expect(document.body.textContent).toContain("Visual de feira.");
    expect(document.body.textContent).toContain("Atual");
    expect(document.body.textContent).not.toContain("Selecionado");
    expect(hex().value).toBe("#1D6B57");
  });

  it("seleciona outro tema e salva com theme e brand_color", async () => {
    const update = vi
      .spyOn(adminApi, "updateStoreTheme")
      .mockResolvedValue({ theme: "feira", brand_color: "#112233", updated_at: "x" });
    await mount();
    await act(async () =>
      document.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click(),
    );
    await type(hex(), "#112233");
    expect(document.body.textContent).toContain("Selecionado");
    await act(async () => button("Salvar").click());
    await waitFor(() => expect(document.body.textContent).toContain("Aparência salva"));
    expect(update).toHaveBeenCalledWith({ theme: "feira", brand_color: "#112233" });
  });

  it("mostra a mensagem do 422 e não marca sucesso", async () => {
    vi.spyOn(adminApi, "updateStoreTheme").mockRejectedValue(
      new ApiError(422, "x", [{ loc: ["body", "brand_color"], msg: "Cor inválida." }]),
    );
    await mount();
    await act(async () => button("Salvar").click());
    await waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toContain("Cor inválida."),
    );
    expect(document.body.textContent).not.toContain("Aparência salva");
  });

  it("restaurar só limpa o campo; Salvar grava brand_color null", async () => {
    const update = vi
      .spyOn(adminApi, "updateStoreTheme")
      .mockResolvedValue({ theme: "gondola", brand_color: null, updated_at: "x" });
    await mount();
    await act(async () => button("Restaurar cor padrão").click());
    expect(hex().value).toBe("");
    expect(update).not.toHaveBeenCalled();
    await act(async () => button("Salvar").click());
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update).toHaveBeenCalledWith({ theme: "gondola", brand_color: null });
  });

  it("avisa quando o contraste fica abaixo de 4,5:1 e bloqueia hex inválido", async () => {
    await mount();
    expect(document.body.textContent).not.toContain("abaixo do mínimo");
    await type(hex(), "#808080");
    expect(document.body.textContent).toContain("abaixo do mínimo");
    await type(hex(), "#12");
    expect(button("Salvar").disabled).toBe(true);
    expect(document.body.textContent).toContain("Mostrando a cor padrão");
    expect(hex().getAttribute("aria-describedby")).toContain("cor-marca-erro");
  });

  it("falha ao carregar mostra erro com nova tentativa", async () => {
    vi.spyOn(adminApi, "getThemes").mockRejectedValue(new ApiError(500, "x"));
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await act(async () =>
      root?.render(
        <QueryClientProvider client={client}>
          <AppearancePage />
        </QueryClientProvider>,
      ),
    );
    await waitFor(() => expect(document.querySelector('[role="alert"]')).not.toBeNull());
    expect(button("Tentar novamente")).toBeDefined();
  });
});
