import { Address, Cart, Category, CheckoutPreview, Order, Product, User } from "../types/domain";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
export type Session = { access_token: string; refresh_token: string; token_type: string };
export type CheckoutInput = { address_id: string; shipping_service_id: number; expected_total_amount: string; payment_method: "PIX"; installments: 1 };
type Envelope<T> = { data: T; message?: string };
export class ApiError extends Error { constructor(public readonly status: number, message: string) { super(message); } }

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body?.detail ?? body?.message ?? "Não foi possível concluir a solicitação.");
  return (body as Envelope<T>).data;
}
export const api = {
  login: (email: string, password: string) => request<Session>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: (token: string) => request<User>("/users/me", {}, token),
  products: () => request<Product[]>("/catalog/products/?limit=100"), categories: () => request<Category[]>("/catalog/categories/?limit=50"),
  cart: (token: string) => request<Cart>("/sales/cart/", {}, token), addCartItem: (token: string, variant_id: string) => request<Cart>("/sales/cart/items", { method: "POST", body: JSON.stringify({ variant_id, quantity: 1 }) }, token), updateCartItem: (token: string, id: string, quantity: number) => request<Cart>(`/sales/cart/items/${id}`, { method: "PATCH", body: JSON.stringify({ quantity }) }, token), removeCartItem: (token: string, id: string) => request<Cart>(`/sales/cart/items/${id}`, { method: "DELETE" }, token),
  addresses: (token: string) => request<Address[]>("/addresses/", {}, token), preview: (token: string, address_id: string) => request<CheckoutPreview>("/sales/checkout/preview", { method: "POST", body: JSON.stringify({ address_id }) }, token),
  mercadoPago: (token: string, input: CheckoutInput, key: string) => request<{ checkout_url: string }>("/sales/checkout/mercado-pago", { method: "POST", headers: { "Idempotency-Key": key }, body: JSON.stringify(input) }, token),
  orders: (token: string) => request<Order[]>("/sales/orders/", {}, token), order: (token: string, id: string) => request<Order>(`/sales/orders/${id}`, {}, token), adminUsers: (token: string) => request<User[]>("/users/list", {}, token),
};
