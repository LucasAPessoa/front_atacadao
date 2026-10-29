// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthProvider";
import { AdminLayout } from "./AdminLayout";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let unmount: () => void;

function mount() {
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  });
  host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  unmount = () => act(() => root.unmount());
  act(() =>
    root.render(
      <MemoryRouter>
        <AuthProvider>
          <AdminLayout />
        </AuthProvider>
      </MemoryRouter>,
    ),
  );
}

afterEach(() => {
  unmount();
  host.remove();
});

const toggle = () => host.querySelector<HTMLButtonElement>(".adm-menu-toggle") as HTMLButtonElement;
const press = (key: string, init: KeyboardEventInit = {}) =>
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
  });

describe("menu mobile do admin", () => {
  it("abre pelo botão, move o foco para a gaveta e mostra o overlay", () => {
    mount();
    expect(toggle().getAttribute("type")).toBe("button");
    act(() => toggle().click());
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(host.querySelector(".adm-sidebar")?.getAttribute("data-open")).toBe("true");
    expect(host.querySelector(".adm-overlay")).not.toBeNull();
    expect(host.querySelector(".adm-sidebar")?.contains(document.activeElement)).toBe(true);
  });

  it("Esc fecha e devolve o foco ao botão", () => {
    mount();
    act(() => toggle().click());
    press("Escape");
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(host.querySelector(".adm-overlay")).toBeNull();
    expect(document.activeElement).toBe(toggle());
  });

  it("clique no overlay fecha", () => {
    mount();
    act(() => toggle().click());
    act(() => host.querySelector<HTMLButtonElement>(".adm-overlay")?.click());
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(toggle());
  });

  it("Tab cicla dentro da gaveta e do botão (foco preso)", () => {
    mount();
    act(() => toggle().click());
    toggle().focus();
    const first = host.querySelector<HTMLElement>(".adm-sidebar a[href]");
    press("Tab");
    expect(document.activeElement).toBe(first);
    press("Tab", { shiftKey: true });
    expect(document.activeElement).toBe(toggle());
  });
});
