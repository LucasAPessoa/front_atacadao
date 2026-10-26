import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, type RouteObject } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../auth/AuthProvider";
import { RequireAdmin } from "../../auth/RequireAdmin";
import { AdminLayout } from "../../layout/AdminLayout";
import { routes } from "../../router";
import { ComingSoon } from "./ComingSoon";
import { comingSoonSections } from "./sections";

vi.stubGlobal("localStorage", {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
});

const guarded = (): RouteObject[] =>
  routes.find((r) => r.element !== undefined)?.children?.[0]?.children ?? [];

describe("seções em breve", () => {
  it.each(comingSoonSections)("$label: título e aviso", ({ label }) => {
    const html = renderToStaticMarkup(<ComingSoon title={label} />);
    expect(html).toContain(`<h1>${label}</h1>`);
    expect(html).toContain("adm-page-header");
    expect(html).toContain("Em breve: esta seção ainda está em desenvolvimento.");
  });

  it.each(comingSoonSections)("$path: rota sob o guard autenticado", ({ path }) => {
    const guard = routes.find((r) => r.element !== undefined);
    expect(isValidElement(guard?.element) && guard.element.type).toBe(RequireAdmin);
    const route = guarded().find((r) => r.path === path);
    expect(route).toBeDefined();
    expect(typeof route?.lazy).toBe("function");
  });

  it("links na sidebar, agrupados como Em breve", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AuthProvider>
          <AdminLayout />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(html.indexOf("Bling")).toBeLessThan(html.indexOf("Em breve"));
    expect(html).toContain("Em breve:");
    for (const { to, label } of comingSoonSections) {
      expect(html).toContain(`href="${to}"`);
      expect(html).toContain(label);
    }
  });
});
