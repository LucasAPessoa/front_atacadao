import type {
  BlingStatus,
  CatalogSyncRun,
  CatalogSyncRuns,
  Address,
  Cart,
  Category,
  CheckoutPreview,
  Order,
  PricingTier,
  Product,
  ProductImage,
  ProductQuestion,
  ProductReview,
  User,
} from "../types/domain";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export type Session = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type Registration = {
  email: string;
  password: string;
  full_name: string;
  user_type: "INDIVIDUAL" | "COMPANY";
  cpf?: string;
  cnpj?: string;
  corporate_name?: string;
  ie?: string;
};

export type AddressInput = {
  zip_code: string;
  street: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
};

export type CheckoutInput = {
  address_id: string;
  shipping_service_id: number;
  expected_total_amount: string;
  coupon_code?: string;
};

export type MercadoPagoCheckout = {
  order_id: string;
  order_code: string;
  checkout_url: string;
  payment_status: string;
};

type Envelope<T> = { data: T; message?: string };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const refreshTokenKey = "ecommerce-atacadao.refresh-token";
const legacyAccessTokenKey = "ecommerce-atacadao.access-token";

// Access token apenas em memória. O refresh token ainda fica no localStorage até
// migrarmos para cookie HttpOnly (depende de domínio próprio; ver front #17).
let accessToken = "";
let onSessionExpired: () => void = () => undefined;
let refreshInFlight: Promise<string> | null = null;

// Remove o access token legado que versões anteriores gravavam no localStorage.
try {
  localStorage.removeItem(legacyAccessTokenKey);
} catch {
  /* sem storage */
}

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => localStorage.getItem(refreshTokenKey);
export const hasStoredSession = () => Boolean(getRefreshToken());
export const setOnSessionExpired = (handler: () => void) => {
  onSessionExpired = handler;
};
export function storeSession(session: Session) {
  accessToken = session.access_token;
  localStorage.setItem(refreshTokenKey, session.refresh_token);
}
export function clearSession() {
  accessToken = "";
  localStorage.removeItem(refreshTokenKey);
  localStorage.removeItem(legacyAccessTokenKey);
}

async function send<T>(path: string, init: RequestInit, bearer?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.detail ?? body?.message ?? "Não foi possível concluir a solicitação.",
    );
  }

  return body === null ? (undefined as T) : (body as Envelope<T>).data;
}

// Single-flight: o refresh token é rotacionado, então um segundo refresh concorrente
// com o token antigo receberia 401 e derrubaria a sessão.
export function refreshSession(notify = true): Promise<string> {
  refreshInFlight ??= (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new ApiError(401, "Sessão expirada.");
    try {
      const session = await send<Session>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      storeSession(session);
      return session.access_token;
    } catch (error) {
      // Falha de rede não encerra a sessão; só a rejeição do servidor.
      if (error instanceof ApiError && [400, 401, 403].includes(error.status)) {
        clearSession();
        if (notify) onSessionExpired();
      }
      throw error;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function expireSession() {
  clearSession();
  onSessionExpired();
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const authenticated = Boolean(token);
  const bearerUsed = authenticated ? accessToken || token : undefined;
  try {
    return await send<T>(path, init, bearerUsed);
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.status !== 401 ||
      !authenticated ||
      path.startsWith("/auth/")
    )
      throw error;
    let fresh: string;
    if (accessToken && accessToken !== bearerUsed) {
      fresh = accessToken; // já houve rotação: só repete com o token atual
    } else {
      try {
        fresh = await refreshSession();
      } catch {
        throw error;
      }
    }
    try {
      // Mesmo init: corpo e Idempotency-Key idênticos no reenvio.
      return await send<T>(path, init, fresh);
    } catch (retryError) {
      if (retryError instanceof ApiError && retryError.status === 401) expireSession();
      throw retryError;
    }
  }
}

export const api = {
  login: (email: string, password: string) =>
    request<Session>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: (token: string, refreshToken: string) =>
    request<{ revoked: boolean }>(
      "/auth/logout",
      { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) },
      token,
    ),
  register: (payload: Registration) =>
    request<User>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  me: (token: string) => request<User>("/users/me", {}, token),
  products: () => request<Product[]>("/catalog/products/?limit=100"),
  product: (id: string) => request<Product>(`/catalog/products/${encodeURIComponent(id)}`),
  productImages: (productId: string) =>
    request<ProductImage[]>(`/catalog/product-images/?product_id=${encodeURIComponent(productId)}`),
  pricingTiers: (productId: string) =>
    request<PricingTier[]>(`/catalog/pricing-tiers/?product_id=${encodeURIComponent(productId)}`),
  productReviews: (productId: string) =>
    request<ProductReview[]>(
      `/catalog/product-reviews/?product_id=${encodeURIComponent(productId)}`,
    ),
  productQuestions: (productId: string) =>
    request<ProductQuestion[]>(
      `/catalog/product-questions/?product_id=${encodeURIComponent(productId)}`,
    ),
  categories: () => request<Category[]>("/catalog/categories/?limit=50"),
  cart: (token: string) => request<Cart>("/sales/cart/", {}, token),
  addCartItem: (token: string, variant_id: string, quantity = 1) =>
    request<Cart>(
      "/sales/cart/items",
      { method: "POST", body: JSON.stringify({ variant_id, quantity }) },
      token,
    ),
  updateCartItem: (token: string, id: string, quantity: number) =>
    request<Cart>(
      `/sales/cart/items/${id}`,
      { method: "PATCH", body: JSON.stringify({ quantity }) },
      token,
    ),
  removeCartItem: (token: string, id: string) =>
    request<Cart>(`/sales/cart/items/${id}`, { method: "DELETE" }, token),
  addresses: (token: string) => request<Address[]>("/addresses/", {}, token),
  createAddress: (token: string, payload: AddressInput & { is_default?: boolean }) =>
    request<Address>("/addresses/", { method: "POST", body: JSON.stringify(payload) }, token),
  updateAddress: (
    token: string,
    id: string,
    payload: Partial<Omit<AddressInput, "number" | "complement" | "neighborhood">> & {
      number?: string | null;
      complement?: string | null;
      neighborhood?: string | null;
    },
  ) =>
    request<Address>(`/addresses/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, token),
  setDefaultAddress: (token: string, id: string) =>
    request<Address>(`/addresses/${id}/default`, { method: "POST" }, token),
  deleteAddress: (token: string, id: string) =>
    request<Record<string, never>>(`/addresses/${id}`, { method: "DELETE" }, token),
  preview: (token: string, address_id: string) =>
    request<CheckoutPreview>(
      "/sales/checkout/preview",
      { method: "POST", body: JSON.stringify({ address_id }) },
      token,
    ),
  mercadoPago: (token: string, input: CheckoutInput, key: string) =>
    request<MercadoPagoCheckout>(
      "/sales/checkout/mercado-pago",
      {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify(input),
      },
      token,
    ),
  orders: (token: string) => request<Order[]>("/sales/orders/", {}, token),
  order: (token: string, id: string) => request<Order>(`/sales/orders/${id}`, {}, token),
  adminUsers: (token: string) => request<User[]>("/users/list", {}, token),
  adminResource: <T>(token: string, resource: string) =>
    request<T[]>(`/catalog/${resource}/`, {}, token),
  createAdminResource: <T>(token: string, resource: string, payload: Record<string, unknown>) =>
    request<T>(`/catalog/${resource}/`, { method: "POST", body: JSON.stringify(payload) }, token),
  updateAdminResource: <T>(
    token: string,
    resource: string,
    id: string,
    payload: Record<string, unknown>,
  ) =>
    request<T>(
      `/catalog/${resource}/${id}`,
      { method: "PATCH", body: JSON.stringify(payload) },
      token,
    ),
  deleteAdminResource: (token: string, resource: string, id: string) =>
    request<void>(`/catalog/${resource}/${id}`, { method: "DELETE" }, token),
  blingStatus: (token: string) => request<BlingStatus>("/integrations/bling/status", {}, token),
  blingConnect: (token: string) =>
    request<{ authorize_url: string }>("/integrations/bling/connect", { method: "POST" }, token),
  blingDisconnect: (token: string) =>
    request<BlingStatus>("/integrations/bling/disconnect", { method: "POST" }, token),
  blingCatalogSync: (token: string) =>
    request<CatalogSyncRun>("/integrations/bling/catalog-sync", { method: "POST" }, token),
  blingCatalogRuns: (token: string, limit = 20) =>
    request<CatalogSyncRuns>(`/integrations/bling/catalog-sync/runs?limit=${limit}`, {}, token),
  cancelOrder: (token: string, id: string) =>
    request<Order>(`/sales/orders/${id}/cancel`, { method: "POST" }, token),
};
