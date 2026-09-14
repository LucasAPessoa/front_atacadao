import { useCallback, useEffect, useState } from "react";
import { navigate } from "../../components/Layout";
import { money } from "../../lib/format";
import { api } from "../../services/client";
import { Order } from "../../types/domain";

type PaymentReturnProps = {
  token: string;
  onError(error: unknown): void;
};

export function PaymentReturn({ token, onError }: PaymentReturnProps) {
  const orderId = new URLSearchParams(window.location.search).get("order_id");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!orderId || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      setOrder(await api.order(token, orderId));
    } catch (error) {
      onError(error);
    } finally {
      setLoading(false);
    }
  }, [onError, orderId, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!token) {
    return (
      <section className="return-page">
        <p className="eyebrow">PAGAMENTO</p>
        <h1>Entre para acompanhar seu pedido.</h1>
        <p>Use a mesma conta da compra para consultar a confirmação do pagamento.</p>
        <button className="primary" onClick={() => navigate("/entrar")}>
          Entrar na minha conta
        </button>
      </section>
    );
  }

  const transactionStatus = order?.transactions[0]?.status;
  const paid = order?.status === "PAID" || transactionStatus === "APPROVED";
  const failed = transactionStatus === "REJECTED" || transactionStatus === "CANCELED";

  return (
    <section className="return-page">
      <p className="eyebrow">PAGAMENTO</p>
      <div className={`payment-result ${paid ? "approved" : failed ? "failed" : "pending"}`}>
        <h1>
          {paid ? "Pagamento aprovado" : failed ? "Pagamento não concluído" : "Aguardando confirmação"}
        </h1>
        <p>
          {paid
            ? "Recebemos a confirmação do seu pagamento."
            : failed
              ? "Você pode voltar ao carrinho e tentar novamente."
              : "O status será atualizado assim que o pagamento for confirmado."}
        </p>
        {order && (
          <div className="payment-order">
            <span>Pedido {order.order_code}</span>
            <strong>{money(order.total_amount)}</strong>
          </div>
        )}
        <div className="result-actions">
          <button className="secondary" disabled={loading} onClick={refresh}>
            {loading ? "Consultando…" : "Atualizar status"}
          </button>
          <button className="primary" onClick={() => navigate(failed ? "/carrinho" : "/")}>
            {failed ? "Voltar ao carrinho" : "Continuar comprando"}
          </button>
        </div>
      </div>
    </section>
  );
}
