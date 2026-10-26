export type Role = "admin" | "user";
export type User = { id: string; email: string; full_name?: string; role: { name: Role } };
export type Variant = {
  id: string;
  product_id?: string;
  variation_name: string;
  base_price: string;
  stock_quantity: number;
  is_active: boolean;
};
export type Product = {
  id: string;
  name: string;
  description?: string | null;
  complementary_description?: string | null;
  main_image_url?: string | null;
  brand?: string | null;
  is_active: boolean;
  categories: Category[];
  variants: Variant[];
};
export type Category = { id: string; name: string; is_active: boolean };
export type CartItem = {
  id: string;
  variant_id: string;
  quantity: number;
  unit_price?: string;
  subtotal?: string;
  variant: Variant;
};
export type Cart = { id: string; items: CartItem[]; total_items: number; total_amount?: string };
export type Address = {
  id: string;
  zip_code: string;
  street: string;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  is_default: boolean;
};
export type CheckoutPreview = {
  subtotal_amount: string;
  items?: Array<{ variant_id: string; product_name: string; variation_name: string }>;
  shipping_options: Array<{
    service_id: number;
    service_name?: string;
    company_name?: string;
    delivery_time_days?: number | null;
    price: string;
    discount_amount?: string;
    total_amount: string;
  }>;
};
export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "CHARGEBACK";
export type FulfillmentStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_RECONCILIATION"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELED"
  | "EXPIRED";
export type Reconciliation = {
  status: "PENDING" | "IN_REVIEW" | "RESOLVED";
  reason:
    | "STOCK_COMMIT_FAILED"
    | "CANCELED_ORDER_APPROVED"
    | "PAYMENT_REFUNDED"
    | "PAYMENT_PARTIALLY_REFUNDED"
    | "PAYMENT_CHARGEBACK";
  outcome: "FULFILLMENT_CONFIRMED" | "REFUND_REQUESTED" | "REFUNDED" | "MANUAL_REVIEW" | null;
  next_poll_after_seconds: number | null;
};
export type Order = {
  id: string;
  order_code: string;
  status: string;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  reconciliation?: Reconciliation | null;
  total_amount: string;
  transactions: Array<{ status: string }>;
};
export type ProductImage = {
  id: string;
  variant_id: string;
  image_url: string;
  is_main: boolean;
};
export type PricingTier = {
  id: string;
  product_id: string;
  min_quantity: number;
  unit_price: string;
};
export type ProductReview = {
  id: string;
  product_id: string;
  rating: number;
  comment?: string | null;
  is_approved: boolean;
  created_at?: string;
};
export type ProductQuestion = {
  id: string;
  product_id: string;
  question_text: string;
  answer_text?: string | null;
  created_at?: string;
};

export type BlingState = "CONNECTED" | "RECONNECT_REQUIRED" | "NOT_CONNECTED";
export type BlingStatus = {
  status: BlingState;
  company: { id: string; name: string } | null;
  connected_at: string | null;
  last_refreshed_at: string | null;
  last_error: { code: string; at: string } | null;
  recent_events: { event: string; reason: string | null; at: string }[];
};

export type CatalogSyncRun = {
  id: string;
  trigger: "SCHEDULED" | "MANUAL";
  status: "RUNNING" | "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED";
  started_at: string;
  finished_at: string | null;
  phase?: string | null;
  counts: {
    created: number;
    updated: number;
    deactivated: number;
    blocked: number;
    unchanged: number;
    failed: number;
  };
  errors: { bling_id: number | string; code: string; message: string }[];
  reason: string | null;
};
export type CatalogSyncRuns = {
  current: CatalogSyncRun | null;
  items: CatalogSyncRun[];
};
