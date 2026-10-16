export type Role = "admin" | "user";
export type User = { id: string; email: string; full_name?: string; role: { name: Role } };
export type Variant = { id: string; variation_name: string; base_price: string; stock_quantity: number; is_active: boolean };
export type Product = { id: string; name: string; description?: string | null; brand?: string | null; is_active: boolean; categories: Category[]; variants: Variant[] };
export type Category = { id: string; name: string; is_active: boolean };
export type CartItem = { id: string; variant_id: string; quantity: number; unit_price?: string; subtotal?: string; variant: Variant };
export type Cart = { id: string; items: CartItem[]; total_items: number; total_amount?: string };
export type Address = { id: string; zip_code: string; street: string; number?: string; city: string; state: string; is_default: boolean };
export type CheckoutPreview = { subtotal_amount: string; shipping_options: Array<{ service_id: number; service_name?: string; company_name?: string; delivery_time_days?: number; total_amount: string }> };
export type PaymentStatus = "PENDING" | "PROCESSING" | "APPROVED" | "REJECTED" | "CANCELED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "CHARGEBACK";
export type FulfillmentStatus = "PENDING_PAYMENT" | "PAYMENT_RECONCILIATION" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELED" | "EXPIRED";
export type Reconciliation = {
  status: "PENDING" | "IN_REVIEW" | "RESOLVED";
  reason: "STOCK_COMMIT_FAILED" | "CANCELED_ORDER_APPROVED" | "PAYMENT_REFUNDED" | "PAYMENT_PARTIALLY_REFUNDED" | "PAYMENT_CHARGEBACK";
  outcome: "FULFILLMENT_CONFIRMED" | "REFUND_REQUESTED" | "REFUNDED" | "MANUAL_REVIEW" | null;
  next_poll_after_seconds: number | null;
};
export type Order = { id: string; order_code: string; status: string; payment_status: PaymentStatus; fulfillment_status: FulfillmentStatus; reconciliation?: Reconciliation | null; total_amount: string; transactions: Array<{ status: string }> };
