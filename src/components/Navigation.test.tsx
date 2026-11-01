// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppLink } from "./AppLink";
import { Layout, searchTarget } from "./Layout";
import { resetDepartments } from "./useDepartments";

const { categories, products } = vi.hoisted(() => ({
  categories: vi.fn(),
  products: vi.fn(),
}));
vi.mock("../services/client", () => ({ api: { categories, products } }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const product = {
  id: "p-1",
  is_active: true,
  categories: [{ id: "c-1", name: "Mercearia" }],
  variants: [{ id: "v-1", is_active: true }],
};

beforeEach(() => {
  resetDepartments();
  categories.mockResolvedValue([
    { id: "c-1", name: "Mercearia", is_active: true },
    { id: "c-2", name: "Vazia", is_active: true },
  ]);
  products.mockResolvedValue([product]);
  window.history.pushState({}, "", "/");
});
afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

async function mount(path: string, query = "") {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const render = async (p: string, q: string) =>
    act(async () => {
      root.render(
        <Layout user={null} cartCount={2} onLogout={() => {}} path={p} query={q}>
          <p id="alvo">conteúdo</p>
        </Layout>,
      );
    });
  await render(path, query);
  return { host, rerender: render };
}

const leftClick = (el: Element, extra: MouseEventInit = {}) =>
  act(async () => {
    el.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...extra }),
    );
  });

describe("navegação com links reais (#67)", () => {
  it("logo, menu, conta, carrinho e rodapé são <a href>, com aria-current na página ativa", async () => {
    const { host } = await mount("/produtos");
    expect(host.querySelector("a.brand")?.getAttribute("href")).toBe("/");
    const nav = host.querySelector("#menu-principal") as HTMLElement;
    const links = [...nav.querySelectorAll("a")].map((a) => [
      a.textContent,
      a.getAttribute("href"),
    ]);
    expect(links).toEqual([
      ["Início", "/"],
      ["Catálogo", "/produtos"],
      ["Como funciona", "/#como-funciona"],
    ]);
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe("Catálogo");
    expect(host.querySelector("a.cart-button")?.getAttribute("href")).toBe("/carrinho");
    expect(host.querySelector('a[aria-label="Entrar"]')?.getAttribute("href")).toBe("/entrar");
    const footer = [...host.querySelectorAll('nav[aria-label="Rodapé"] a')].map((a) =>
      a.getAttribute("href"),
    );
    expect(footer).toEqual(["/", "/produtos", "/carrinho"]);
    expect(host.querySelector("header button:not(.mobile-menu):not([type=submit])")).toBeNull();
  });

  it("clique simples navega sem recarregar; ctrl+clique segue o href", async () => {
    const { host } = await mount("/");
    const catalog = [...host.querySelectorAll("#menu-principal a")][1];
    await leftClick(catalog, { ctrlKey: true });
    expect(window.location.pathname).toBe("/");
    await leftClick(catalog);
    expect(window.location.pathname).toBe("/produtos");
  });

  it("chips de departamento só com produto à venda, fora do header fixo, ativo pela URL", async () => {
    const { host } = await mount("/produtos", "?categoria=c-1&busca=arroz");
    const nav = host.querySelector('nav[aria-label="Departamentos"]') as HTMLElement;
    expect(nav.closest("header")).toBeNull();
    const chips = [...nav.querySelectorAll("a")];
    expect(chips.map((a) => a.textContent)).toEqual(["Todos", "Mercearia"]);
    // No catálogo, trocar de departamento mantém a busca.
    expect(chips[0].getAttribute("href")).toBe("/produtos?busca=arroz");
    expect(chips[1].getAttribute("href")).toBe("/produtos?categoria=c-1&busca=arroz");
    expect(chips[1].getAttribute("aria-current")).toBe("page");
    // Catálogo não fica "ativo" quando um departamento está escolhido.
    expect(host.querySelector('#menu-principal [aria-current="page"]')).toBeNull();
  });
});

describe("foco e menu (#67)", () => {
  it("fora do catálogo os chips não têm Todos nem levam a busca", async () => {
    const { host } = await mount("/", "?busca=arroz");
    const chips = [...host.querySelectorAll('nav[aria-label="Departamentos"] a')];
    expect(chips.map((a) => a.getAttribute("href"))).toEqual(["/produtos?categoria=c-1"]);
  });

  it("trocar de página põe o foco no conteúdo", async () => {
    const { rerender } = await mount("/");
    expect(document.activeElement).not.toBe(document.getElementById("conteudo"));
    await rerender("/produtos", "");
    expect(document.activeElement).toBe(document.getElementById("conteudo"));
  });

  it("Esc fecha o menu aberto e devolve o foco ao botão", async () => {
    const { host } = await mount("/");
    const toggle = host.querySelector(".mobile-menu") as HTMLButtonElement;
    await act(async () => toggle.click());
    expect(host.querySelector("#menu-principal")?.className).toContain("open");
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(host.querySelector("#menu-principal")?.className).not.toContain("open");
    expect(document.activeElement).toBe(toggle);
  });
});

describe("altura do cabeçalho para as âncoras (#67)", () => {
  it("mede --header-h ao sair de /entrar (sem cabeçalho) para a loja", async () => {
    const observed: Element[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe(el: Element) {
          observed.push(el);
        }
        disconnect() {}
      },
    );
    try {
      document.documentElement.style.removeProperty("--header-h");
      const { host, rerender } = await mount("/entrar");
      expect(host.querySelector("header")).toBeNull();
      expect(observed).toHaveLength(0);
      await rerender("/", "");
      expect(observed).toEqual([host.querySelector("header")]);
      expect(document.documentElement.style.getPropertyValue("--header-h")).toMatch(/px$/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("foco só na troca de página (#67)", () => {
  it("buscar ou trocar de chip não tira o foco de onde o usuário está", async () => {
    const { host, rerender } = await mount("/produtos", "");
    const input = host.querySelector("#busca-header") as HTMLInputElement;
    input.focus();
    await rerender("/produtos", "?busca=arroz");
    expect(document.activeElement).toBe(input);
  });
});

describe("busca única sincronizada com ?busca= (#67)", () => {
  it("é um formulário dentro de <search>, com enterKeyHint e envio pelo Enter", async () => {
    const { host } = await mount("/");
    const form = host.querySelector("search > form.header-search") as HTMLFormElement;
    const input = form.querySelector("input") as HTMLInputElement;
    expect(input.getAttribute("enterkeyhint")).toBe("search");
    expect(host.querySelectorAll('input[type="search"]')).toHaveLength(1);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, "arroz");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(window.location.pathname + window.location.search).toBe("/produtos?busca=arroz");
  });

  it("URL → campo: trocar ?busca= atualiza o texto, e sem busca o campo esvazia", async () => {
    const { host, rerender } = await mount("/produtos", "?busca=feij%C3%A3o");
    const input = host.querySelector("#busca-header") as HTMLInputElement;
    expect(input.value).toBe("feijão");
    await rerender("/produtos", "?busca=arroz");
    expect(input.value).toBe("arroz");
    await rerender("/produtos", "");
    expect(input.value).toBe("");
  });

  it("no catálogo a busca mantém o departamento; fora dele, não", () => {
    expect(searchTarget(" arroz ", "/produtos", "?categoria=c-1&busca=x")).toBe(
      "/produtos?categoria=c-1&busca=arroz",
    );
    expect(searchTarget("arroz", "/", "?categoria=c-1")).toBe("/produtos?busca=arroz");
    expect(searchTarget("  ", "/produtos", "")).toBe("/produtos");
  });
});

describe("AppLink com âncora", () => {
  it("na mesma página só rola até a seção, sem mexer no histórico", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const target = document.createElement("section");
    target.id = "como-funciona";
    target.scrollIntoView = vi.fn();
    document.body.append(target);
    const length = window.history.length;
    await act(async () => {
      createRoot(host).render(<AppLink href="/#como-funciona">Como funciona</AppLink>);
    });
    await leftClick(host.querySelector("a") as HTMLAnchorElement);
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(window.history.length).toBe(length);
  });
});
