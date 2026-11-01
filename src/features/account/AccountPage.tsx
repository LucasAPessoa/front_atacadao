import { useEffect, useState } from "react";
import { navigate } from "../../components/Layout";
import { money } from "../../lib/format";
import { orderPresentation } from "../../lib/orderStatus";
import { ApiError, api } from "../../services/client";
import { AddressManager } from "./AddressManager";
import type { Address, Order, User } from "../../shared/types/domain";

type Props = {
  token: string;
  user: User | null;
  addresses: Address[];
  onAddresses(): Promise<void>;
  onError(error: unknown): void;
  onLogout(): void;
};
const toneGlyph = { approved: "✓", failed: "✕", attention: "!", pending: "◌" } as const;
const statusLabel = (order: Order) => {
  const payment = orderPresentation(order);
  if (payment.tone !== "approved" || order.fulfillment_status === "PAID") return payment.label;
  const fulfillmentLabels: Partial<Record<Order["fulfillment_status"], string>> = {
    PROCESSING: "Em preparação",
    SHIPPED: "Enviado",
    DELIVERED: "Entregue",
  };
  return fulfillmentLabels[order.fulfillment_status] ?? payment.label;
};
const operationalStatuses = new Set<Order["fulfillment_status"]>([
  "PENDING_PAYMENT",
  "PAYMENT_RECONCILIATION",
  "PAID",
  "PROCESSING",
  "SHIPPED",
]);
/** Texto do erro do histórico: sem conexão e falha do servidor não parecem "nenhum pedido". */
export function ordersErrorText(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429)
      return "Muitas consultas seguidas. Aguarde um instante e tente de novo.";
    if (error.status >= 500) return "A loja não respondeu agora. Seus pedidos continuam salvos.";
    return "Não conseguimos consultar seus pedidos. Tente de novo em instantes.";
  }
  return "Sem conexão com a loja agora. Verifique a internet e tente de novo.";
}

/** Contador sem dado (falha na consulta): "—" na tela, "indisponível" para o leitor de tela. */
function Unavailable() {
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr-only">indisponível</span>
    </>
  );
}

export function AccountPage({ token, user, addresses, onAddresses, onError, onLogout }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` é o gatilho de "Tentar novamente".
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    // O erro some só quando a nova consulta dá certo: o painel (e o foco no botão) fica.
    api
      .orders(token)
      .then((list) => {
        if (!alive) return;
        setOrders(list);
        setError(null);
      })
      .catch((reason) => {
        // Mantém os pedidos já carregados; o erro aparece no próprio painel, não como vazio.
        if (!alive) return;
        setError(reason);
        if (reason instanceof ApiError && reason.status === 401) onError(reason);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token, onError, attempt]);
  const failed = error !== null;
  const unknownCount = failed && orders.length === 0;
  if (!user)
    return (
      <section className="account-page gate-page">
        <p className="eyebrow">SUA CONTA</p>
        <h1>Entre para acessar sua área.</h1>
        <p>Seus pedidos e dados ficam disponíveis após a autenticação.</p>
        <button type="button" className="primary" onClick={() => navigate("/entrar")}>
          Entrar na conta
        </button>
      </section>
    );
  const firstName = (user.full_name || user.email).split(" ")[0];
  const activeOrders = orders.filter((order) => operationalStatuses.has(order.fulfillment_status));
  return (
    <section className="account-page">
      <header className="account-hero">
        <div>
          <p className="eyebrow">MINHA CONTA</p>
          <h1>Olá, {firstName}.</h1>
          <p>Tenha uma visão simples de pedidos, dados e compras.</p>
        </div>
        <div className="account-actions">
          <div className="account-avatar" aria-hidden="true">
            {firstName.slice(0, 1).toUpperCase()}
          </div>
          <button type="button" className="secondary" onClick={onLogout}>
            Sair da conta
          </button>
        </div>
      </header>
      <div className="account-overview">
        <article>
          <h2>Pedidos em andamento</h2>
          <strong>{unknownCount ? <Unavailable /> : activeOrders.length}</strong>
          <span className="sub">acompanhe o status por aqui</span>
        </article>
        <article>
          <h2>Pedidos realizados</h2>
          <strong>{unknownCount ? <Unavailable /> : orders.length}</strong>
          <span className="sub">histórico da sua conta</span>
        </article>
        <article>
          <h2>Perfil da conta</h2>
          <strong>{user.role.name === "admin" ? "Admin" : "Cliente"}</strong>
          <span className="sub">{user.email}</span>
        </article>
      </div>
      <div className="account-columns">
        <section className="account-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">HISTÓRICO</p>
              <h2>Seus pedidos</h2>
            </div>
            <button type="button" className="link-button" onClick={() => navigate("/produtos")}>
              Continuar comprando →
            </button>
          </div>
          {failed && (
            <div className="inline-error" role="alert">
              <strong>
                <span aria-hidden="true">⚠ </span>
                {orders.length
                  ? "Não foi possível atualizar seus pedidos."
                  : "Não foi possível carregar seus pedidos."}
              </strong>
              <p>{ordersErrorText(error)}</p>
              <button
                type="button"
                className="secondary"
                disabled={loading}
                onClick={() => setAttempt((n) => n + 1)}
              >
                {loading ? "Tentando…" : "Tentar novamente"}
              </button>
            </div>
          )}
          {loading && !orders.length ? (
            <div className="inline-loading" role="status">
              Consultando pedidos…
            </div>
          ) : orders.length ? (
            <div>
              {orders.map((order) => (
                <article key={order.id} className="order-row">
                  <span
                    className={`status-dot status-${orderPresentation(order).tone}`}
                    aria-hidden="true"
                  >
                    {toneGlyph[orderPresentation(order).tone]}
                  </span>
                  <div>
                    <strong>{order.order_code}</strong>
                    <small>{statusLabel(order)}</small>
                  </div>
                  <b>{money(order.total_amount)}</b>
                </article>
              ))}
            </div>
          ) : failed ? null : (
            <div className="empty-inline">
              <strong>Ainda não há pedidos por aqui.</strong>
              <p>Quando você finalizar uma compra, ela aparecerá nesta área.</p>
              <button type="button" className="secondary" onClick={() => navigate("/produtos")}>
                Explorar produtos
              </button>
            </div>
          )}
        </section>
        <aside className="account-panel settings-panel">
          <p className="eyebrow">PREFERÊNCIAS</p>
          <h2>Dados da conta</h2>
          <dl>
            <div>
              <dt>Nome</dt>
              <dd>{user.full_name || "Não informado"}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Endereços</dt>
              <dd>
                {addresses.length
                  ? `${addresses.length} cadastrado${addresses.length > 1 ? "s" : ""}`
                  : "Nenhum cadastrado"}
              </dd>
            </div>
          </dl>
          <p className="account-hint">
            As informações de pagamento ficam no ambiente seguro do Mercado Pago.
          </p>
        </aside>
      </div>
      <AddressManager
        token={token}
        addresses={addresses}
        onChanged={onAddresses}
        onError={onError}
      />
    </section>
  );
}
