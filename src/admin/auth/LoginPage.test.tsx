// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { Component as LoginPage } from "./LoginPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("login do painel (#74)", () => {
  it("cabeçalho fora do cartão e Mostrar/Ocultar senha", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    });
    const host = document.createElement("div");
    document.body.append(host);
    await act(async () => {
      createRoot(host).render(
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>,
      );
    });
    expect(host.querySelector(".adm-login-head h1")?.textContent).toBe("Entrar no painel");
    expect(host.querySelector(".adm-login-card h1")).toBeNull();
    const input = host.querySelector("#adm-password") as HTMLInputElement;
    const toggle = host.querySelector('[aria-controls="adm-password"]') as HTMLButtonElement;
    expect(input.type).toBe("password");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    await act(async () => toggle.click());
    expect(input.type).toBe("text");
    expect(toggle.textContent).toBe("Ocultar");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
  });
});
