import type {
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
} from "../shared/types/domain";
import {
  API_BASE_URL,
  ApiError,
  type Session,
  createRequester,
  createTokenStore,
} from "../shared/http";

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

export { API_BASE_URL, ApiError };
export type { Session };

const tokens = createTokenStore("ecommerce-atacadao.refresh-token", [
  "ecommerce-atacadao.access-token",
]);
const { request } = createRequester(tokens);

export const getAccessToken = tokens.getAccessToken;
export const getRefreshToken = tokens.getRefreshToken;
export const hasStoredSession = tokens.hasStoredSession;
export const setOnSessionExpired = tokens.setOnSessionExpired;
export const storeSession = tokens.storeSession;
export const clearSession = tokens.clearSession;
export const refreshSession = tokens.refreshSession;

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
};
