import type { Order } from "../shared/types/domain";

export type OrderTone = "approved" | "failed" | "pending" | "attention";
export type OrderPresentation = {
  tone: OrderTone;
  title: string;
  description: string;
  label: string;
  terminal: boolean;
  canRetryPayment: boolean;
};

export function orderPresentation(order: Order): OrderPresentation {
  const payment = order.payment_status;
  const outcome = order.reconciliation?.outcome;

  if (payment === "REFUNDED" || outcome === "REFUNDED")
    return {
      tone: "failed",
      title: "Reembolso confirmado",
      description:
        "O Mercado Pago confirmou o reembolso. O prazo para o valor aparecer depende do meio de pagamento e da instituição financeira.",
      label: "Reembolsado",
      terminal: true,
      canRetryPayment: false,
    };
  if (payment === "PARTIALLY_REFUNDED")
    return {
      tone: "attention",
      title: "Reembolso parcial confirmado",
      description:
        "Parte do pagamento foi reembolsada. Consulte o pedido e acompanhe novas atualizações por aqui.",
      label: "Reembolso parcial",
      terminal: true,
      canRetryPayment: false,
    };
  if (outcome === "REFUND_REQUESTED")
    return {
      tone: "attention",
      title: "Reembolso solicitado",
      description:
        "A solicitação foi registrada e está em processamento. A confirmação aparecerá aqui quando for recebida.",
      label: "Reembolso em processamento",
      terminal: false,
      canRetryPayment: false,
    };
  if (payment === "APPROVED" && outcome === "FULFILLMENT_CONFIRMED")
    return {
      tone: "approved",
      title: "Pedido confirmado",
      description: "A disponibilidade foi confirmada e seu pedido seguirá para preparação.",
      label: "Disponibilidade confirmada",
      terminal: true,
      canRetryPayment: false,
    };
  if (payment === "APPROVED" && outcome === "MANUAL_REVIEW")
    return {
      tone: "attention",
      title: "Pagamento confirmado",
      description:
        "Nossa equipe está analisando o atendimento deste pedido. Acompanhe novas atualizações por aqui.",
      label: "Em análise",
      terminal: true,
      canRetryPayment: false,
    };
  if (payment === "APPROVED" && order.fulfillment_status === "PAYMENT_RECONCILIATION")
    return {
      tone: "attention",
      title: "Pagamento confirmado",
      description:
        "Estamos verificando a disponibilidade do pedido. Acompanhe a atualização por aqui.",
      label: "Em verificação",
      terminal: order.reconciliation?.status === "RESOLVED",
      canRetryPayment: false,
    };
  if (payment === "APPROVED")
    return {
      tone: "approved",
      title: "Pagamento confirmado",
      description: "Recebemos a confirmação e seu pedido seguirá para preparação.",
      label: order.fulfillment_status === "PAID" ? "Pago" : "Pagamento confirmado",
      terminal: true,
      canRetryPayment: false,
    };
  if (payment === "REJECTED" || payment === "CANCELED")
    return {
      tone: "failed",
      title: "Pagamento não concluído",
      description: "O pagamento não foi confirmado. Revise seu pedido antes de tentar novamente.",
      label: payment === "REJECTED" ? "Pagamento recusado" : "Pagamento cancelado",
      terminal: true,
      canRetryPayment: true,
    };
  if (payment === "CHARGEBACK")
    return {
      tone: "attention",
      title: "Pagamento em análise",
      description:
        "Há uma contestação relacionada a este pagamento. Acompanhe as atualizações por aqui.",
      label: "Pagamento contestado",
      terminal: true,
      canRetryPayment: false,
    };
  return {
    tone: "pending",
    title: "Aguardando confirmação",
    description: "O status será atualizado assim que o Mercado Pago confirmar o pagamento.",
    label: "Aguardando pagamento",
    terminal: false,
    canRetryPayment: false,
  };
}
