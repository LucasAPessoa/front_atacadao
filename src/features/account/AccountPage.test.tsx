// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../services/client";
import type { Order, User } from "../../shared/types/domain";
import { AccountPage, ordersErrorText } from "./AccountPage";

const { orders } = vi.hoisted(() => ({ orders: vi.fn() }));
vi.mock("../../services/client", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../services/client")>();
  return { ...real, api: { ...real.api, orders } };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const user = { id: "u", email: "ana@x.com", full_name: "Ana Lima", role: { name: "user" } } as User;
const order = {
  id: "o-1",
  order_code: "PED-0001",
  total_amount: "50.00",
  fulfillment_status: "PAID",
  payment_status: "APPROVED",
  status: "PAID",
} as unknown as Order;

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

async function mount(token = "t", onError = vi.fn()) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const render = (t: string) =>
    act(async () => {
      root.render(
        <AccountPage
          token={t}
          user={user}
          addresses={[]}
          onAddresses={async () => {}}
          onError={onError}
          onLogout={() => {}}
        />,
      );
    });
  await render(token);
  return { host, render, onError };
}

const retry = (host: HTMLElement) =>
  [...host.querySelectorAll("button")].find((b) => b.textContent === "Tentar novamente");

describe("histórico de pedidos (#7)", () => {
  it("sem pedidos mostra o vazio, sem alerta", async () => {
    orders.mockResolvedValue([]);
    const { host } = await mount();
    expect(host.textContent).toContain("Ainda não há pedidos por aqui.");
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });

  it("falha na consulta não parece vazio: alerta próprio, contadores em — e nova tentativa", async () => {
    orders.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { host, onError } = await mount();
    const alert = host.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain("Não foi possível carregar seus pedidos.");
    expect(alert.textContent).toContain("Sem conexão com a loja");
    expect(host.textContent).not.toContain("Ainda não há pedidos por aqui.");
    const counts = [...host.querySelectorAll(".account-overview strong")].map((s) => s.textContent);
    expect(counts.slice(0, 2)).toEqual(["—indisponível", "—indisponível"]);
    expect(host.querySelector(".account-overview .sr-only")?.textContent).toBe("indisponível");
    // O erro fica no painel, não vira aviso global.
    expect(onError).not.toHaveBeenCalled();

    // Durante a nova tentativa o painel continua, com o botão em "Tentando…".
    let finish: (list: Order[]) => void = () => {};
    orders.mockReturnValueOnce(new Promise<Order[]>((r) => (finish = r)));
    await act(async () => retry(host)?.click());
    const busy = [...host.querySelectorAll("button")].find((b) => b.textContent === "Tentando…");
    expect(busy?.disabled).toBe(true);
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    await act(async () => finish([order]));
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(host.textContent).toContain("PED-0001");
    expect(orders).toHaveBeenCalledTimes(2);
  });

  it("falha depois de já ter pedidos mantém a lista e avisa que não atualizou", async () => {
    orders.mockResolvedValueOnce([order]);
    const { host, render } = await mount("t1");
    orders.mockRejectedValueOnce(new ApiError(502, "Bad gateway"));
    await render("t2");
    expect(host.textContent).toContain("PED-0001");
    const alert = host.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain("Não foi possível atualizar seus pedidos.");
    expect(alert.textContent).toContain("A loja não respondeu");
  });

  it("401 segue para o tratamento global de sessão", async () => {
    const expired = new ApiError(401, "Não autenticado");
    orders.mockRejectedValueOnce(expired);
    const { onError } = await mount();
    expect(onError).toHaveBeenCalledWith(expired);
  });

  it("textos do erro: rede, servidor e limite", () => {
    expect(ordersErrorText(new TypeError("x"))).toContain("Sem conexão");
    expect(ordersErrorText(new ApiError(500, "x"))).toContain("não respondeu");
    expect(ordersErrorText(new ApiError(429, "x"))).toContain("Aguarde");
    // 4xx não repassa texto técnico do servidor.
    expect(ordersErrorText(new ApiError(403, "Forbidden"))).not.toContain("Forbidden");
  });
});
