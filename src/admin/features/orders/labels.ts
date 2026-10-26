export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAYMENT_RECONCILIATION",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELED",
  "EXPIRED",
] as const;

export const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  PAYMENT_RECONCILIATION: "Conciliação de pagamento",
  PAID: "Pago",
  PROCESSING: "Em separação",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado",
  EXPIRED: "Expirado",
};
export const statusLabel = (status: string | null | undefined) =>
  status ? (statusLabels[status] ?? status) : "—";

export const statusTone = (status: string): "success" | "warning" | "danger" | undefined => {
  if (["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(status)) return "success";
  if (["PENDING_PAYMENT", "PAYMENT_RECONCILIATION"].includes(status)) return "warning";
  if (["CANCELED", "EXPIRED"].includes(status)) return "danger";
  return undefined;
};

export const paymentMethodLabels: Record<string, string> = {
  MERCADO_PAGO: "Mercado Pago",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  BOLETO: "Boleto",
};
export const transactionStatusLabels: Record<string, string> = {
  PENDING: "Pendente",
  PROCESSING: "Processando",
  APPROVED: "Aprovado",
  REJECTED: "Recusado",
  CANCELED: "Cancelado",
  REFUNDED: "Estornado",
  PARTIALLY_REFUNDED: "Estornado parcialmente",
  CHARGEBACK: "Chargeback",
};
export const reconciliationStatusLabels: Record<string, string> = {
  PENDING: "Pendente",
  IN_REVIEW: "Em análise",
  RESOLVED: "Resolvida",
};
export const reconciliationReasonLabels: Record<string, string> = {
  STOCK_COMMIT_FAILED: "Falha ao baixar o estoque",
  CANCELED_ORDER_APPROVED: "Pagamento aprovado em pedido cancelado",
  PAYMENT_REFUNDED: "Pagamento estornado",
  PAYMENT_PARTIALLY_REFUNDED: "Pagamento estornado parcialmente",
  PAYMENT_CHARGEBACK: "Chargeback",
};
export const reconciliationOutcomeLabels: Record<string, string> = {
  FULFILLMENT_CONFIRMED: "Atendimento confirmado",
  REFUND_REQUESTED: "Estorno solicitado",
  REFUNDED: "Estornado",
  MANUAL_REVIEW: "Revisão manual",
};
export const refundStatusLabels: Record<string, string> = {
  REQUESTED: "Solicitado",
  APPROVED: "Aprovado",
  REJECTED: "Recusado",
  COMPLETED: "Concluído",
};
export const label = (map: Record<string, string>, key: string | null | undefined) =>
  key ? (map[key] ?? key) : "—";

export const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("pt-BR") : "—";

export type OrderActionKey = "cancel" | "reconcile" | "request_refund";
export const actionTexts: Record<
  OrderActionKey,
  { button: string; title: string; message: string; done: string; tone: "default" | "danger" }
> = {
  cancel: {
    button: "Cancelar pedido",
    title: "Cancelar este pedido?",
    message: "O pedido será cancelado e as reservas de estoque, liberadas.",
    done: "Pedido cancelado.",
    tone: "danger",
  },
  reconcile: {
    button: "Reconciliar pagamento",
    title: "Reconciliar o pagamento?",
    message: "O servidor consultará o gateway e atualizará o pedido.",
    done: "Pagamento reconciliado.",
    tone: "default",
  },
  request_refund: {
    button: "Solicitar estorno",
    title: "Solicitar o estorno do pagamento?",
    message: "O estorno será solicitado ao gateway de pagamento.",
    done: "Estorno solicitado.",
    tone: "danger",
  },
};
