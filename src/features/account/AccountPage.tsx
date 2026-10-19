import { useEffect, useState } from "react";
import { navigate } from "../../components/Layout";
import { money } from "../../lib/format";
import { orderPresentation } from "../../lib/orderStatus";
import { api } from "../../services/client";
import { AddressManager } from "./AddressManager";
import type { Address, Order, User } from "../../types/domain";

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
export function AccountPage({ token, user, addresses, onAddresses, onError, onLogout }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .orders(token)
      .then(setOrders)
      .catch(onError)
      .finally(() => setLoading(false));
  }, [token, onError]);
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
          <strong>{activeOrders.length}</strong>
          <span className="sub">acompanhe o status por aqui</span>
        </article>
        <article>
          <h2>Pedidos realizados</h2>
          <strong>{orders.length}</strong>
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
          {loading ? (
            <div className="inline-loading">Consultando pedidos…</div>
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
          ) : (
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
