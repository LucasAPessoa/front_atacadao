import { useCallback, useEffect, useState } from "react";
import { navigate } from "../../components/Layout";
import { money } from "../../lib/format";
import { orderPresentation } from "../../lib/orderStatus";
import { api } from "../../services/client";
import type { Order } from "../../types/domain";

type PaymentReturnProps = {
  token: string;
  onError(error: unknown): void;
};

const pollDelays = [2_000, 4_000, 8_000, ...Array(10).fill(10_000)];

export function PaymentReturn({ token, onError }: PaymentReturnProps) {
  const orderId = new URLSearchParams(window.location.search).get("order_id");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId || !token) return null;
    const nextOrder = await api.order(token, orderId);
    setOrder(nextOrder);
    sessionStorage.removeItem("ecommerce-atacadao.pending-order-id");
    return nextOrder;
  }, [orderId, token]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadOrder();
    } catch (error) {
      onError(error);
    } finally {
      setRefreshing(false);
    }
  }, [loadOrder, onError]);

  useEffect(() => {
    if (!orderId || !token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let timer: number | undefined;

    const poll = async (attempt: number) => {
      try {
        const nextOrder = await loadOrder();
        if (cancelled || !nextOrder || orderPresentation(nextOrder).terminal) return;
        const serverDelay = nextOrder.reconciliation?.next_poll_after_seconds;
        const delay = serverDelay ? serverDelay * 1_000 : pollDelays[attempt];
        if (delay !== undefined && attempt < pollDelays.length)
          timer = window.setTimeout(() => void poll(attempt + 1), delay);
      } catch (error) {
        if (!cancelled) onError(error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void poll(0);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [loadOrder, onError, orderId, token]);

  if (!token) {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    return (
      <section className="return-page">
        <p className="eyebrow">PAGAMENTO</p>
        <h1>Entre para acompanhar seu pedido.</h1>
        <p>Use a mesma conta da compra para consultar a confirmação do pagamento.</p>
        <button
          type="button"
          className="primary"
          onClick={() => navigate(`/entrar?returnTo=${encodeURIComponent(returnTo)}`)}
        >
          Entrar na minha conta
        </button>
      </section>
    );
  }

  if (!orderId) {
    return (
      <section className="return-page">
        <p className="eyebrow">PAGAMENTO</p>
        <h1>Não encontramos o pedido.</h1>
        <p>Abra seus pedidos para consultar o pagamento com segurança.</p>
        <button type="button" className="primary" onClick={() => navigate("/conta")}>
          Ver meus pedidos
        </button>
      </section>
    );
  }

  const presentation = order ? orderPresentation(order) : null;

  return (
    <section className="return-page" aria-busy={loading || refreshing}>
      <p className="eyebrow">PAGAMENTO · MERCADO PAGO</p>
      <div className={`payment-result ${presentation?.tone ?? "pending"}`} aria-live="polite">
        <h1>{presentation?.title ?? "Consultando pagamento"}</h1>
        <p>
          {presentation?.description ?? "Estamos buscando o estado mais recente do seu pedido."}
        </p>
        {order && (
          <div className="payment-order">
            <span>Pedido {order.order_code}</span>
            <strong>{money(order.total_amount)}</strong>
          </div>
        )}
        <div className="result-actions">
          <button
            type="button"
            className="secondary"
            disabled={loading || refreshing}
            onClick={() => void refresh()}
          >
            {loading || refreshing ? "Consultando…" : "Atualizar status"}
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => navigate(presentation?.canRetryPayment ? "/carrinho" : "/conta")}
          >
            {presentation?.canRetryPayment ? "Revisar pedido" : "Ver meus pedidos"}
          </button>
        </div>
      </div>
    </section>
  );
}
