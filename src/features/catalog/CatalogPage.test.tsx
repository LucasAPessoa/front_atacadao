// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, RequestTimeoutError } from "../../services/client";
import type { Product } from "../../shared/types/domain";
import { CatalogPage, ProductGrid } from "./CatalogPage";

const { addCartItem, products } = vi.hoisted(() => ({
  addCartItem: vi.fn(),
  products: vi.fn(),
}));
vi.mock("../../services/client", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../services/client")>();
  return {
    ...real,
    api: {
      products: (signal?: AbortSignal) => products(signal),
      categories: async () => [],
      addCartItem,
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  products.mockImplementation(async () => [product]);
});

const product = {
  id: "p-1",
  is_active: true,
  name: "Arroz 5kg",
  brand: "Marca",
  categories: [{ id: "c-1", name: "Mercearia" }],
  main_image_url: null,
  variants: [
    {
      id: "v-1",
      variation_name: "Pacote",
      base_price: "25.00",
      is_active: true,
      stock_quantity: 4,
    },
  ],
} as unknown as Product;

const withTiers = {
  ...product,
  variants: [
    {
      ...product.variants[0],
      unit_price: "25.00",
      pricing_tiers: [
        { id: "t1", min_quantity: 1, unit_price: "25.00" },
        { id: "t", min_quantity: 5, unit_price: "22.00" },
      ],
    },
  ],
} as unknown as Product;

function Harness() {
  const [adding, setAdding] = useState("");
  return (
    <ProductGrid
      loading={false}
      unavailable={false}
      visible={[product]}
      adding={adding}
      onAdd={(item) => setAdding(adding ? "" : item.id)}
      onOpen={() => {}}
    />
  );
}

let root: ReturnType<typeof createRoot> | undefined;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

describe("ProductGrid", () => {
  it("mantém o mesmo botão e o foco após adicionar ao carrinho", () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<Harness />));
    const button = host.querySelector<HTMLButtonElement>("button.product-add");
    expect(button).not.toBeNull();
    button?.focus();
    expect(document.activeElement).toBe(button);
    act(() => button?.click());
    const after = host.querySelector<HTMLButtonElement>("button.product-add");
    expect(after).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(after?.getAttribute("aria-disabled")).toBe("true");
  });

  it("ignora segundo clique enquanto o item está sendo adicionado", async () => {
    let resolve: (cart: unknown) => void = () => {};
    addCartItem.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const onCart = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(
        <CatalogPage
          token="t"
          onLogin={() => {}}
          onCart={onCart}
          onError={() => {}}
          mode="catalog"
          query=""
        />,
      );
    });
    const button = host.querySelector<HTMLButtonElement>("button.product-add");
    await act(async () => button?.click());
    await act(async () => button?.click());
    expect(addCartItem).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ id: "cart" }));
    expect(onCart).toHaveBeenCalledTimes(1);
  });

  it("card sem controle de quantidade, com dica da próxima faixa", () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() =>
      root?.render(
        <ProductGrid
          loading={false}
          unavailable={false}
          visible={[withTiers]}
          adding=""
          onAdd={() => {}}
          onOpen={() => {}}
        />,
      ),
    );
    expect(host.querySelector("input")).toBeNull();
    expect(host.querySelector(".product-add")?.textContent).toBe("Adicionar");
    expect(host.querySelector(".product-hint")?.textContent).toContain("A partir de 5");
  });

  it("tabela de preços do card abre fechada e alterna aria-expanded", () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    act(() =>
      root?.render(
        <ProductGrid
          loading={false}
          unavailable={false}
          visible={[withTiers]}
          adding=""
          onAdd={() => {}}
          onOpen={() => {}}
        />,
      ),
    );
    const toggle = host.querySelector<HTMLButtonElement>(".card-tiers-toggle");
    const panel = host.querySelector<HTMLElement>(".card-tiers");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(panel?.hidden).toBe(true);
    act(() => toggle?.click());
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(panel?.hidden).toBe(false);
    expect(panel?.textContent).toContain("1 a 4");
    expect(panel?.textContent).toContain("5 ou mais");
    expect(panel?.textContent).toContain("R$");
  });
});

describe("home sem numeração decorativa (#64)", () => {
  it("vantagens em lista sem número, passos numerados, sem 01/02 e sem texto técnico", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(
      <CatalogPage
        token=""
        onLogin={() => {}}
        onCart={() => {}}
        onError={() => {}}
        mode="home"
        query=""
      />,
    );
    expect(html).toMatch(
      /<ul class="wrap benefits"><li><span class="perk-n" aria-hidden="true">✓<\/span>/,
    );
    expect(html).toContain("Preço por faixa");
    expect(html).toMatch(/<ol class="steps"><li><span class="perk-n" aria-hidden="true">1<\/span>/);
    expect(html).not.toContain("big-num");
    expect(html).not.toMatch(/class="(num|idx)"/);
    expect(html).not.toMatch(/>0\d</);
    expect(html).not.toContain("servidor");
  });
});

describe("falha ao abrir o catálogo (#6)", () => {
  const mount = async () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    const onError = vi.fn();
    await act(async () => {
      root?.render(
        <CatalogPage
          token=""
          onLogin={() => {}}
          onCart={() => {}}
          onError={onError}
          mode="catalog"
          query=""
        />,
      );
    });
    return { host, onError };
  };

  it("mostra o motivo e Tentar novamente refaz a busca sem recarregar", async () => {
    products.mockRejectedValueOnce(new RequestTimeoutError());
    const { host, onError } = await mount();
    const alert = host.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain("A loja demorou para responder.");
    expect(alert.textContent).not.toContain("Atualize a página");
    expect(onError).not.toHaveBeenCalled();
    const retry = [...alert.querySelectorAll("button")].find(
      (b) => b.textContent === "Tentar novamente",
    ) as HTMLButtonElement;
    let finish: (list: unknown[]) => void = () => {};
    products.mockReturnValueOnce(new Promise((r) => (finish = r)));
    await act(async () => retry.click());
    // Painel continua durante a nova tentativa, com o botão em "Tentando…".
    const busy = host.querySelector('[role="alert"] button') as HTMLButtonElement;
    expect(busy.textContent).toBe("Tentando…");
    expect(busy.disabled).toBe(true);
    await act(async () => finish([product]));
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.textContent).toContain("Arroz 5kg");
    expect(products).toHaveBeenCalledTimes(2);
  });

  it("passa um AbortSignal e cancela a busca ao sair da página", async () => {
    let signal: AbortSignal | undefined;
    products.mockImplementationOnce((s?: AbortSignal) => {
      signal = s;
      return new Promise(() => {});
    });
    await mount();
    expect(signal?.aborted).toBe(false);
    act(() => root?.unmount());
    root = undefined;
    expect(signal?.aborted).toBe(true);
  });

  it("textos por tipo de falha", async () => {
    const { unavailableText } = await import("./CatalogPage");
    expect(unavailableText(new ApiError(503, "x"))).toContain("instabilidade");
    expect(unavailableText(new TypeError("Failed to fetch"))).toContain("Sem conexão");
  });
});

describe("catálogo sem busca própria (#67)", () => {
  it("lê ?busca= da URL, mostra o termo e oferece limpar; sem filtro lateral", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(
        <CatalogPage
          token=""
          onLogin={() => {}}
          onCart={() => {}}
          onError={() => {}}
          mode="catalog"
          query="?busca=arroz"
        />,
      );
    });
    expect(host.querySelector('input[type="search"]')).toBeNull();
    const count = host.querySelector(".catalog-count") as HTMLElement;
    expect(count.textContent).toContain("1 resultado para “arroz”");
    expect(count.querySelector("a")?.getAttribute("href")).toBe("/produtos");
    // Um filtro só: os departamentos ficam nos chips do cabeçalho.
    expect(host.querySelector(".filter-side, .filter-row")).toBeNull();
    expect(host.querySelector("nav.breadcrumbs a")?.getAttribute("href")).toBe("/");
  });
});
