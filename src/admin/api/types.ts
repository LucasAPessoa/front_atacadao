// Tipos espelhando specs/007-portal-admin/contracts/http-api.md. Dinheiro é sempre string decimal.
import type { Page, PageMeta, Session } from "../../shared/http";
import type {
  BlingStatus,
  CatalogSyncRun,
  CatalogSyncRuns,
  Category,
  PricingTier,
  StoreThemeSettings,
  ThemeOption,
  User,
} from "../../shared/types/domain";

export type {
  BlingStatus,
  CatalogSyncRun,
  CatalogSyncRuns,
  Category,
  Page,
  PageMeta,
  PricingTier,
  Session,
  StoreThemeSettings,
  ThemeOption,
  User,
};

export type PendingReason = "INCOMPLETE_WEIGHT" | "INCOMPLETE_DIMENSIONS" | "INCOMPLETE_PRICE";

// Produtos
export type ProductSortKey = "name" | "price" | "stock" | "updated_at";
export type ProductListParams = {
  q?: string;
  category_id?: string;
  active?: boolean;
  visible?: boolean;
  featured?: boolean;
  low_stock?: boolean;
  pending?: boolean;
  customized?: boolean;
  sort?: ProductSortKey;
  order?: "asc" | "desc";
  skip?: number;
  limit?: number;
};
export type AdminProductSummary = {
  id: string;
  code: string;
  name: string;
  bling_name: string;
  main_image_url: string | null;
  is_active: boolean;
  visible: boolean;
  featured: boolean;
  customized: boolean;
  min_price: string;
  max_price: string;
  stock: number;
  low_stock: boolean;
  pending_count: number;
  updated_at: string;
};
export type AdminVariant = {
  id: string;
  bling_sku: string;
  gtin: string | null;
  variation_name: string;
  base_price: string;
  stock_quantity: number;
  is_active: boolean;
  weight_kg: number | null;
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  pending_reason: PendingReason | null;
  images: string[];
};
export type Overridable<T> = { bling: T; site: T | null; locked: boolean };
export type Presentation = {
  name: Overridable<string | null>;
  description: Overridable<string | null>;
  complementary_description: Overridable<string | null>;
  categories: {
    bling: { id: string; name: string }[];
    site: { id: string; name: string; is_active: boolean }[];
    locked: boolean;
  };
  visible: boolean;
  featured: boolean;
  updated_at: string | null;
  updated_by: { id: string; full_name: string } | null;
};
export type AdminProductDetail = {
  id: string;
  bling_id: number;
  code: string;
  is_active: boolean;
  brand: string | null;
  unit: string | null;
  bling_updated_at: string | null;
  variants: AdminVariant[];
  pricing_tiers: { id: string; min_quantity: number; unit_price: string }[];
  presentation: Presentation;
};
export type PresentationPatch = {
  name?: { locked: boolean; value?: string };
  description?: { locked: boolean; value?: string };
  complementary_description?: { locked: boolean; value?: string };
  categories?: { locked: boolean; category_ids?: string[] };
  visible?: boolean;
  featured?: boolean;
};
export type BulkPresentationPatch = {
  product_ids: string[];
  visible?: boolean;
  featured?: boolean;
};

// Pedidos
export type OrderListParams = {
  status?: string[];
  created_from?: string;
  created_to?: string;
  customer?: string;
  skip?: number;
  limit?: number;
};
export type AdminOrderSummary = {
  id: string;
  order_code: string;
  status: string;
  created_at: string;
  total_amount: string;
  items_count: number;
  customer: { id: string; full_name: string; email: string };
};
export type OrderAction = "cancel" | "reconcile" | "request_refund";
export type AdminOrderItem = {
  id: string;
  variant_id: string;
  quantity: number;
  unit_price_snapshot: string;
  base_price_snapshot: string;
  product_name_snapshot: string;
  variation_name_snapshot: string;
  sku_snapshot: string;
  pricing_tier_min_quantity?: number | null;
  subtotal: string;
};
export type AdminOrderReconciliation = {
  status: "PENDING" | "IN_REVIEW" | "RESOLVED";
  reason: string;
  outcome: string | null;
};
export type ReconciliationQueueItem = {
  id: string;
  order_id: string;
  status: string;
  reason: string;
  outcome: string | null;
  next_poll_after_seconds: number | null;
  refund_status: string | null;
  refund_attempts: number | null;
  refund_last_attempt_at: string | null;
  refund_next_retry_at: string | null;
  refund_last_error_code: string | null;
};
export type AdminOrderDetail = {
  id: string;
  order_code: string;
  status: string;
  reconciliation?: AdminOrderReconciliation | null;
  created_at: string;
  updated_at?: string;
  coupon_code?: string | null;
  currency?: string;
  shipping_provider?: string;
  shipping_delivery_time_days?: number | null;
  subtotal_amount: string;
  discount_amount: string;
  shipping_fee: string;
  total_amount: string;
  shipping_service_name: string | null;
  shipping_address_snapshot: Record<string, unknown>;
  items: AdminOrderItem[];
  transactions: {
    id: string;
    payment_method: string;
    amount: string;
    status: string;
    gateway_status_detail?: string | null;
    installments?: number;
    gateway_provider?: string;
    paid_at?: string | null;
  }[];
  customer: { id: string; full_name: string; email: string };
  status_history: {
    old_status: string | null;
    new_status: string;
    created_at: string;
    changed_by: string | null;
  }[];
  allowed_actions: OrderAction[];
};

// Dashboard
export type DashboardSummary = {
  from: string;
  to: string;
  timezone: string;
  revenue: string;
  paid_orders: number;
  average_ticket: string;
  orders_by_status: Record<string, number>;
  low_stock_products: number;
  low_stock_threshold: number;
  bling_pending_products: number;
};

// Moderação
export type ReviewFilter = "pending" | "approved" | "all";
export type QuestionFilter = "unanswered" | "answered" | "all";
export type ModerationReview = {
  id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  product: { id: string; name: string };
  author: { id: string; full_name: string };
};
export type ModerationQuestion = {
  id: string;
  question_text: string;
  answer_text: string | null;
  created_at: string;
  product: { id: string; name: string };
  author: { id: string; full_name: string };
};

// Bling
export type BlingPendingItem = {
  product_id: string;
  product_name: string;
  variant_id: string;
  bling_sku: string | null;
  reason: PendingReason;
};
export type BlingPendingParams = { reason?: PendingReason; skip?: number; limit?: number };
