// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardSummary } from "../../api/types";
import { adminTokens } from "../../auth/session";
import { waitFor } from "../../test-utils";
import { Dashboard } from "./Dashboard";
import { resolvePeriod, todayInStoreZone } from "./period";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const zeros: DashboardSummary = {
  from: "2026-10-26",
  to: "2026-10-26",
  timezone: "America/Sao_Paulo",
  revenue: "0.00",
  paid_orders: 0,
  average_ticket: "0.00",
  orders_by_status: {},
  low_stock_products: 0,
  low_stock_threshold: 5,
  bling_pending_products: 0,
  pricing_pending_products: 0,
  tier_warning_products: 0,
  store_price_missing_products: 0,
};

const memory = new Map<string, string>();
let urls: string[];
let respond: () => { status: number; body: unknown };

beforeEach(() => {
  memory.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  });
  adminTokens.storeSession({ access_token: "a", refresh_token: "r", token_type: "bearer" });
  urls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      urls.push(String(input));
      const { status, body } = respond();
      return new Response(JSON.stringify(body), { status });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

async function mount(initial: string) {
  const box = document.createElement("div");
  document.body.append(box);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    createRoot(box).render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initial]}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
  return box;
}
const summaryCalls = () => urls.filter((u) => u.includes("/admin/dashboard/summary"));

describe("período", () => {
  it("usa a data do fuso de São Paulo, não a UTC", () => {
    expect(todayInStoreZone(new Date("2026-10-27T01:30:00Z"))).toBe("2026-10-26");
    expect(resolvePeriod("7d", "", "", new Date("2026-10-27T01:30:00Z"))).toEqual({
      ok: true,
      from: "2026-10-20",
      to: "2026-10-26",
    });
    expect(resolvePeriod("mes", "", "", new Date("2026-10-27T01:30:00Z"))).toEqual({
      ok: true,
      from: "2026-10-01",
      to: "2026-10-26",
    });
  });
  it("rejeita personalizado incompleto ou invertido", () => {
    expect(resolvePeriod("custom", "2026-10-10", "", new Date()).ok).toBe(false);
    expect(resolvePeriod("custom", "2026-10-10", "2026-10-01", new Date()).ok).toBe(false);
    expect(resolvePeriod("custom", "2026-02-30", "2026-03-01", new Date()).ok).toBe(false);
  });
});

describe("dashboard", () => {
  it("mostra zeros sem erro e links com filtros corretos", async () => {
    respond = () => ({ status: 200, body: { data: zeros } });
    const box = await mount("/");
    await waitFor(() => expect(box.textContent).toContain("Faturamento"));
    expect(box.textContent).toContain("R$ 0,00");
    expect(box.textContent).toContain("5 ou menos");
    expect(box.querySelector('[role="alert"]')).toBeNull();
    const hrefs = [...box.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/produtos?low_stock=true");
    expect(hrefs).toContain("/bling");
    expect(box.querySelectorAll(".adm-bar-row").length).toBeGreaterThan(0);
  });

  it("formata BRL a partir da string e traduz status", async () => {
    respond = () => ({
      status: 200,
      body: {
        data: {
          ...zeros,
          revenue: "1234567.80",
          paid_orders: 3,
          average_ticket: "411522.60",
          orders_by_status: { PAID: 3, CANCELED: 1 },
        },
      },
    });
    const box = await mount("/?periodo=30d");
    await waitFor(() => expect(box.textContent).toContain("R$ 1.234.567,80"));
    expect(box.textContent).toContain("R$ 411.522,60");
    expect(box.textContent).toContain("Pago");
    expect(box.textContent).toContain("Cancelado");
    expect(summaryCalls().at(-1)).toMatch(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/);
  });

  it("período inválido mostra aviso e não consulta a API", async () => {
    respond = () => ({ status: 200, body: { data: zeros } });
    const box = await mount("/?periodo=custom&de=2026-10-10&ate=2026-10-01");
    expect(box.querySelector('[role="alert"]')?.textContent).toContain("inicial");
    expect(summaryCalls()).toHaveLength(0);
  });

  it("período desconhecido na URL cai em hoje", async () => {
    respond = () => ({ status: 200, body: { data: zeros } });
    await mount("/?periodo=xyz");
    await waitFor(() => expect(summaryCalls().length).toBe(1));
    expect(summaryCalls()[0]).toContain(`from=${todayInStoreZone()}`);
  });

  it("422 do servidor vira erro com nova tentativa", async () => {
    respond = () => ({
      status: 422,
      body: { detail: [{ msg: "from inválido", loc: [], type: "x" }] },
    });
    const box = await mount("/");
    await waitFor(() => expect(box.querySelector('[role="alert"]')).not.toBeNull());
    expect(box.textContent).toContain("Tentar novamente");
  });
});
