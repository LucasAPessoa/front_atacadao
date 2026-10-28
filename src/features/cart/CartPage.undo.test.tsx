// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Cart } from "../../shared/types/domain";
import { CartPage } from "./CartPage";

const mocks = vi.hoisted(() => ({
  removeCartItem: vi.fn(),
  addCartItem: vi.fn(),
}));
vi.mock("../../services/client", () => ({
  api: { products: async () => [], ...mocks },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const item = {
  id: "i1",
  variant_id: "v1",
  quantity: 2,
  unit_price: "10.00",
  subtotal: "20.00",
  variant: { base_price: "10.00", variation_name: "Caixa" },
};
const full = { total_items: 2, total_amount: "20.00", items: [item] } as unknown as Cart;
const empty = { total_items: 0, total_amount: "0.00", items: [] } as unknown as Cart;

let root: ReturnType<typeof createRoot> | undefined;
const onCart = vi.fn();
const onError = vi.fn();
const flush = () => act(async () => {});
async function mount(cart: Cart) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root?.render(
      <CartPage
        token="t"
        cart={cart}
        addresses={[]}
        onAddresses={async () => {}}
        onCart={onCart}
        onLogin={() => {}}
        onError={onError}
      />,
    ),
  );
}
const byText = (text: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent === text) as HTMLButtonElement;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.removeCartItem.mockResolvedValue(empty);
});
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

describe("Desfazer no carrinho", () => {
  it("mantém a barra com o último item removido, foca Desfazer e readiciona variante e quantidade", async () => {
    await mount(full);
    await act(async () => document.querySelector<HTMLButtonElement>(".remove")?.click());
    await mount(empty);
    expect(document.querySelector(".undo-bar")?.textContent).toContain("saiu do carrinho");
    expect(document.activeElement).toBe(byText("Desfazer"));
    expect(document.querySelector(".undo-region")?.getAttribute("role")).toBe("status");
    mocks.addCartItem.mockResolvedValue(full);
    await act(async () => byText("Desfazer").click());
    expect(mocks.addCartItem).toHaveBeenCalledWith("t", "v1", 2);
    expect(onCart).toHaveBeenLastCalledWith(full);
    expect(document.querySelector(".undo-bar")).toBeNull();
  });

  it("erro ao desfazer chama onError e mantém a barra", async () => {
    await mount(full);
    await act(async () => document.querySelector<HTMLButtonElement>(".remove")?.click());
    const failure = new Error("falha");
    mocks.addCartItem.mockRejectedValue(failure);
    await act(async () => byText("Desfazer").click());
    await flush();
    expect(onError).toHaveBeenCalledWith(failure);
    expect(document.querySelector(".undo-bar")).not.toBeNull();
  });

  it("Dispensar fecha a barra", async () => {
    await mount(full);
    await act(async () => document.querySelector<HTMLButtonElement>(".remove")?.click());
    await act(async () => byText("Dispensar").click());
    expect(document.querySelector(".undo-bar")).toBeNull();
  });
});
