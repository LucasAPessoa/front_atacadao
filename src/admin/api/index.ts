import { ApiError } from "../../shared/http";
import { adminTokens, request, requestPage } from "../auth/session";
import type {
  AdminOrderDetail,
  AdminOrderSummary,
  AdminProductDetail,
  AdminProductSummary,
  BlingPendingItem,
  BlingPendingParams,
  BlingStatus,
  BulkPresentationPatch,
  CatalogSyncRun,
  CatalogSyncRuns,
  Category,
  DashboardSummary,
  ModerationQuestion,
  ModerationReview,
  OrderListParams,
  PresentationPatch,
  PricingTier,
  ProductListParams,
  QuestionFilter,
  ReconciliationQueueItem,
  ReviewFilter,
  Session,
  User,
} from "./types";

type Query = Record<string, string | number | boolean | string[] | undefined | null>;

/** Monta a query string; ignora vazios e repete chaves de lista (ex.: `status`). */
export function qs(params: Query = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) for (const item of value) search.append(key, item);
    else search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

const json = (method: string, body?: unknown, headers?: Record<string, string>): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  ...(headers ? { headers } : {}),
});

/**
 * Regras de sessão do portal: 403 em /admin/* ou 401 sem refresh possível encerram a sessão
 * (o AuthProvider volta ao login com aviso).
 */
async function guarded<T>(path: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError && !path.startsWith("/auth/")) {
      const forbidden = error.status === 403 && path.startsWith("/admin/");
      const unauthorized = error.status === 401 && !adminTokens.hasStoredSession();
      if (forbidden || unauthorized) adminTokens.expireSession();
    }
    throw error;
  }
}

const call = <T>(path: string, init: RequestInit = {}, signal?: AbortSignal) =>
  guarded(path, () => request<T>(path, { ...init, signal }, true));
const callPage = <T>(path: string, signal?: AbortSignal) =>
  guarded(path, () => requestPage<T>(path, { signal }, true));

export const adminApi = {
  // Autenticação (rotas existentes). Login e a checagem de papel usam bearer explícito: a sessão
  // só é gravada depois que o papel admin é confirmado.
  login: (email: string, password: string) =>
    request<Session>("/auth/login", json("POST", { email, password })),
  meWith: (accessToken: string) => request<User>("/users/me", {}, accessToken),
  logoutWith: (accessToken: string, refreshToken: string) =>
    request<{ revoked: boolean }>(
      "/auth/logout",
      json("POST", { refresh_token: refreshToken }),
      accessToken,
    ),
  me: (signal?: AbortSignal) => call<User>("/users/me", {}, signal),

  // Dashboard
  dashboard: (range: { from?: string; to?: string } = {}, signal?: AbortSignal) =>
    call<DashboardSummary>(`/admin/dashboard/summary${qs(range)}`, {}, signal),

  // Produtos
  products: (params: ProductListParams = {}, signal?: AbortSignal) =>
    callPage<AdminProductSummary>(`/admin/products${qs(params)}`, signal),
  product: (id: string, signal?: AbortSignal) =>
    call<AdminProductDetail>(`/admin/products/${encodeURIComponent(id)}`, {}, signal),
  updatePresentation: (id: string, patch: PresentationPatch) =>
    call<AdminProductDetail["presentation"]>(
      `/admin/products/${encodeURIComponent(id)}/presentation`,
      json("PATCH", patch),
    ),
  bulkPresentation: (patch: BulkPresentationPatch) =>
    call<{ updated: number }>("/admin/products/presentation", json("PATCH", patch)),
  updateVariantPrice: (variantId: string, basePrice: string) =>
    call<unknown>(
      `/catalog/product-variants/${encodeURIComponent(variantId)}`,
      json("PATCH", { base_price: basePrice }),
    ),
  categories: (signal?: AbortSignal) =>
    call<Category[]>("/catalog/categories/?limit=100", {}, signal),
  pricingTiers: (productId: string, signal?: AbortSignal) =>
    call<PricingTier[]>(`/catalog/pricing-tiers/${qs({ product_id: productId })}`, {}, signal),
  createPricingTier: (input: { product_id: string; min_quantity: number; unit_price: string }) =>
    call<PricingTier>("/catalog/pricing-tiers/", json("POST", input)),
  updatePricingTier: (id: string, input: { min_quantity?: number; unit_price?: string }) =>
    call<PricingTier>(`/catalog/pricing-tiers/${encodeURIComponent(id)}`, json("PATCH", input)),
  deletePricingTier: (id: string) =>
    call<void>(`/catalog/pricing-tiers/${encodeURIComponent(id)}`, json("DELETE")),

  // Pedidos
  orders: (params: OrderListParams = {}, signal?: AbortSignal) =>
    callPage<AdminOrderSummary>(`/admin/orders${qs(params)}`, signal),
  order: (id: string, signal?: AbortSignal) =>
    call<AdminOrderDetail>(`/admin/orders/${encodeURIComponent(id)}`, {}, signal),
  reconciliationQueue: (skip = 0, limit = 50, signal?: AbortSignal) =>
    call<ReconciliationQueueItem[]>(
      `/sales/orders/payment-reconciliations/queue${qs({ skip, limit })}`,
      {},
      signal,
    ),
  cancelOrder: (id: string) =>
    call<unknown>(`/sales/orders/${encodeURIComponent(id)}/cancel`, json("POST")),
  reconcileOrder: (id: string) =>
    call<unknown>(`/sales/orders/${encodeURIComponent(id)}/reconcile`, json("POST")),
  requestRefund: (id: string) =>
    call<unknown>(`/sales/orders/${encodeURIComponent(id)}/request-refund`, json("POST")),

  // Moderação
  reviews: (
    params: { status?: ReviewFilter; product_id?: string; skip?: number; limit?: number } = {},
    signal?: AbortSignal,
  ) => callPage<ModerationReview>(`/admin/moderation/reviews${qs(params)}`, signal),
  questions: (
    params: { status?: QuestionFilter; product_id?: string; skip?: number; limit?: number } = {},
    signal?: AbortSignal,
  ) => callPage<ModerationQuestion>(`/admin/moderation/questions${qs(params)}`, signal),
  setReviewApproval: (id: string, isApproved: boolean) =>
    call<unknown>(
      `/catalog/product-reviews/${encodeURIComponent(id)}`,
      json("PATCH", { is_approved: isApproved }),
    ),
  deleteReview: (id: string) =>
    call<void>(`/catalog/product-reviews/${encodeURIComponent(id)}`, json("DELETE")),
  answerQuestion: (id: string, answerText: string) =>
    call<unknown>(
      `/catalog/product-questions/${encodeURIComponent(id)}`,
      json("PATCH", { answer_text: answerText }),
    ),
  deleteQuestion: (id: string) =>
    call<void>(`/catalog/product-questions/${encodeURIComponent(id)}`, json("DELETE")),

  // Bling
  blingStatus: (signal?: AbortSignal) =>
    call<BlingStatus>("/integrations/bling/status", {}, signal),
  blingConnect: () => call<{ authorize_url: string }>("/integrations/bling/connect", json("POST")),
  blingDisconnect: () => call<BlingStatus>("/integrations/bling/disconnect", json("POST")),
  blingCatalogSync: () => call<CatalogSyncRun>("/integrations/bling/catalog-sync", json("POST")),
  blingCatalogRuns: (limit = 20, signal?: AbortSignal) =>
    call<CatalogSyncRuns>(`/integrations/bling/catalog-sync/runs${qs({ limit })}`, {}, signal),
  blingPending: (params: BlingPendingParams = {}, signal?: AbortSignal) =>
    callPage<BlingPendingItem>(`/admin/bling/pending${qs(params)}`, signal),
};
