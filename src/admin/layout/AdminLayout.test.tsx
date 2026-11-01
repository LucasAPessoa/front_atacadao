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
  vi.stubGlobal("innerWidth", 360);
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
  vi.unstubAllGlobals();
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
    expect(host.querySelector(".adm-nav-scrim")).not.toBeNull();
    expect(host.querySelector(".adm-sidebar")?.contains(document.activeElement)).toBe(true);
  });

  it("Esc fecha e devolve o foco ao botão", () => {
    mount();
    act(() => toggle().click());
    press("Escape");
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(host.querySelector(".adm-nav-scrim")).toBeNull();
    expect(document.activeElement).toBe(toggle());
  });

  it("clique no overlay fecha", () => {
    mount();
    act(() => toggle().click());
    act(() => host.querySelector<HTMLButtonElement>(".adm-nav-scrim")?.click());
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

describe("menu mobile e resize", () => {
  it("fecha a gaveta quando a largura passa de 768px", () => {
    mount();
    act(() => toggle().click());
    vi.stubGlobal("innerWidth", 1024);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
  });
});

describe("sidebar no Sistema Gôndola (#74)", () => {
  it("cada item tem ícone de 20px; marca com subtítulo; grupo Em breve sem dois-pontos", () => {
    mount();
    const items = [...host.querySelectorAll("#adm-menu > a")];
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const icon = item.querySelector("svg.adm-nav-icon");
      expect(icon?.getAttribute("width")).toBe("20");
      expect(icon?.getAttribute("aria-hidden")).toBe("true");
    }
    expect(host.querySelector(".adm-brand-sub")?.textContent).toBe("Painel da loja");
    expect(host.querySelector("#adm-nav-soon")?.textContent).toBe("Em breve");
  });

  it("Sair fica no rodapé da sidebar, e não na topbar", () => {
    mount();
    const logout = host.querySelector(".adm-sidebar-foot button");
    expect(logout?.textContent).toBe("Sair");
    expect(host.querySelector(".adm-topbar")?.textContent).not.toContain("Sair");
    expect(host.querySelector('#adm-menu a[href="/"]')?.textContent).toBe("Painel");
  });
});
