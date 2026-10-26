// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminOrderDetail, AdminOrderSummary } from "../../api/types";
import { adminTokens } from "../../auth/session";
import { waitFor } from "../../test-utils";
import { ToastProvider } from "../../ui/Toast";
import { OrderDetail } from "./OrderDetail";
import { OrdersList } from "./OrdersList";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const summary: AdminOrderSummary = {
  id: "o-1",
  order_code: "PED-0001",
  status: "PENDING_PAYMENT",
  created_at: "2026-10-26T12:00:00Z",
  total_amount: "1234.50",
  items_count: 3,
  customer: { id: "c-1", full_name: "Maria Souza", email: "maria@example.com" },
};
const detail = (actions: AdminOrderDetail["allowed_actions"], status = "PENDING_PAYMENT") =>
  ({
    id: "o-1",
    order_code: "PED-0001",
    status,
    created_at: "2026-10-26T12:00:00Z",
    subtotal_amount: "100.00",
    discount_amount: "0.00",
    shipping_fee: "15.00",
    total_amount: "115.00",
    shipping_service_name: "Sedex",
    shipping_address_snapshot: { street: "Rua A", city: "Recife" },
    items: [
      {
        id: "i-1",
        variant_id: "v-1",
        quantity: 2,
        unit_price_snapshot: "50.00",
        base_price_snapshot: "55.00",
        product_name_snapshot: "Café",
        variation_name_snapshot: "500 g",
        sku_snapshot: "CAF-500",
        subtotal: "100.00",
      },
    ],
    transactions: [],
    customer: summary.customer,
    status_history: [
      {
        old_status: null,
        new_status: "PENDING_PAYMENT",
        created_at: "2026-10-26T12:00:00Z",
        changed_by: null,
      },
    ],
    allowed_actions: actions,
  }) satisfies AdminOrderDetail;

const memory = new Map<string, string>();
let calls: { url: string; method: string }[];
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
      calls.push({ url, method });
      const { status, body } = respond(url, method);
      return new Response(JSON.stringify(body), { status });
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
              <Route path="/pedidos" element={<OrdersList />} />
              <Route path="/pedidos/:id" element={<OrderDetail />} />
            </Routes>
            <Probe />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    );
  });
  return box;
}
const buttons = (box: HTMLElement) =>
  [...box.querySelectorAll("button")].map((b) => b.textContent ?? "");
const click = async (el: Element | undefined) => {
  await act(async () => {
    (el as HTMLElement).click();
  });
};
const findButton = (box: HTMLElement, text: string) =>
  [...box.querySelectorAll("button")].find((b) => b.textContent === text);
const listCalls = () => calls.filter((c) => c.url.includes("/admin/orders?"));

describe("lista de pedidos", () => {
  it("mostra colunas e restaura filtros da URL na consulta", async () => {
    respond = () => ({
      status: 200,
      body: { data: [summary], meta: { total: 1, skip: 25, limit: 25 } },
    });
    const box = await mount(
      "/pedidos?status=PAID,CANCELED&created_from=2026-10-01&customer=maria&skip=25",
    );
    await waitFor(() => expect(box.textContent).toContain("PED-0001"));
    expect(box.textContent).toContain("Aguardando pagamento");
    expect(box.textContent).toContain("R$ 1.234,50");
    expect(box.textContent).toContain("Maria Souza");
    const url = listCalls().at(-1)?.url ?? "";
    for (const part of [
      "status=PAID",
      "status=CANCELED",
      "created_from=2026-10-01",
      "customer=maria",
      "skip=25",
    ])
      expect(url).toContain(part);
  });

  it("valores inválidos na URL caem no padrão", async () => {
    respond = () => ({ status: 200, body: { data: [], meta: { total: 0, skip: 0, limit: 25 } } });
    await mount("/pedidos?status=XYZ&created_from=ontem&skip=-3");
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(0));
    const url = listCalls().at(-1)?.url ?? "";
    expect(url).not.toContain("status=");
    expect(url).not.toContain("created_from");
    expect(url).toContain("skip=0");
  });

  it("marcar status reflete na URL", async () => {
    respond = () => ({
      status: 200,
      body: { data: [summary], meta: { total: 1, skip: 0, limit: 25 } },
    });
    const box = await mount("/pedidos?skip=25");
    await waitFor(() => expect(box.textContent).toContain("PED-0001"));
    const paid = box.querySelector("input[value=PAID]") as HTMLInputElement;
    await click(paid);
    expect(search).toContain("status=PAID");
    expect(search).not.toContain("skip");
  });
});

describe("detalhe do pedido", () => {
  it("não mostra ação que o servidor não permitiu", async () => {
    respond = () => ({ status: 200, body: { data: detail(["reconcile"]) } });
    const box = await mount("/pedidos/o-1");
    await waitFor(() => expect(box.textContent).toContain("Pedido PED-0001"));
    expect(box.textContent).toContain("R$ 115,00");
    expect(box.textContent).toContain("Rua A");
    expect(buttons(box)).toContain("Reconciliar pagamento");
    expect(buttons(box)).not.toContain("Cancelar pedido");
    expect(buttons(box)).not.toContain("Solicitar estorno");
  });

  it("cancela com confirmação e invalida detalhe", async () => {
    let canceled = false;
    respond = (_url, method) => {
      if (method === "POST") {
        canceled = true;
        return { status: 200, body: { data: {} } };
      }
      return {
        status: 200,
        body: { data: canceled ? detail([], "CANCELED") : detail(["cancel"]) },
      };
    };
    const box = await mount("/pedidos/o-1");
    await waitFor(() => expect(buttons(box)).toContain("Cancelar pedido"));
    await click(findButton(box, "Cancelar pedido"));
    expect(calls.some((c) => c.method === "POST")).toBe(false);
    expect(document.body.textContent).toContain("Cancelar este pedido?");
    await click(findButton(document.body, "Confirmar"));
    await waitFor(() => expect(buttons(box)).not.toContain("Cancelar pedido"));
    expect(calls.find((c) => c.method === "POST")?.url).toContain("/sales/orders/o-1/cancel");
    expect(box.textContent).toContain("Cancelado");
    expect(document.body.textContent).toContain("Pedido cancelado.");
  });

  it.each([409, 400])("exibe o erro %i do servidor", async (status) => {
    respond = (_url, method) =>
      method === "POST"
        ? { status, body: { detail: "Pedido já foi pago." } }
        : { status: 200, body: { data: detail(["cancel"]) } };
    const box = await mount("/pedidos/o-1");
    await waitFor(() => expect(buttons(box)).toContain("Cancelar pedido"));
    await click(findButton(box, "Cancelar pedido"));
    await click(findButton(document.body, "Confirmar"));
    await waitFor(() =>
      expect(box.querySelector("[role=alert].adm-alert")?.textContent).toBe("Pedido já foi pago."),
    );
  });
});

describe("fila de conciliação", () => {
  it("lista a fila e reconcilia o pedido", async () => {
    respond = (_url, method) =>
      method === "POST"
        ? { status: 200, body: { data: { reconciled: true } } }
        : {
            status: 200,
            body: {
              data: [
                {
                  id: "r-1",
                  order_id: "o-9",
                  status: "PENDING",
                  reason: "STOCK_COMMIT_FAILED",
                  outcome: null,
                  next_poll_after_seconds: null,
                  refund_status: null,
                  refund_attempts: null,
                  refund_last_attempt_at: null,
                  refund_next_retry_at: null,
                  refund_last_error_code: null,
                },
              ],
            },
          };
    const box = await mount("/pedidos?aba=fila");
    await waitFor(() => expect(box.textContent).toContain("Falha ao baixar o estoque"));
    await click(findButton(box, "Reconciliar pagamento"));
    await click(findButton(document.body, "Reconciliar"));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "POST")?.url).toContain("/sales/orders/o-9/reconcile"),
    );
  });
});
