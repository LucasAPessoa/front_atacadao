export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export type Variant = { id: string; variation_name: string; base_price: string; stock_quantity: number; is_active: boolean };
export type Product = { id: string; name: string; description?: string | null; brand?: string | null; is_active: boolean; variants: Variant[] };
export type Category = { id: string; name: string; is_active: boolean };
export type CartItem = { id: string; variant_id: string; quantity: number; unit_price?: string; subtotal?: string; variant: Variant };
export type Cart = { id: string; items: CartItem[]; total_items: number; total_amount?: string };
export type Address = { id: string; zip_code: string; street: string; number?: string; city: string; state: string; is_default: boolean };
export type Session = { access_token: string; refresh_token: string; token_type: "bearer" };
export type ShippingQuote = { service_id: number; service_name?: string; company_name?: string; price: string; delivery_time_days?: number };
export type CheckoutPreview = { subtotal_amount: string; shipping_options: Array<ShippingQuote & { discount_amount: string; total_amount: string }> };
export type CheckoutInput = { address_id: string; coupon_code?: string; shipping_service_id: number; expected_total_amount: string; payment_method: "PIX" | "CREDIT_CARD" | "BOLETO"; installments: number };
export type MercadoPagoCheckout = { order_id: string; order_code: string; checkout_url: string; payment_status: string };
export type OrderStatus = { id: string; order_code: string; status: string; total_amount: string; transactions: Array<{ status: string }> };
type Envelope<T> = { data: T; message?: string };

export class ApiError extends Error { constructor(public readonly status: number, message: string) { super(message); } }

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body?.detail ?? body?.message ?? "Não foi possível concluir a solicitação.");
  return (body as Envelope<T>).data;
}

export const api = {
  products: () => request<Product[]>("/catalog/products/?limit=100"),
  categories: () => request<Category[]>("/catalog/categories/?limit=50"),
  login: (email: string, password: string) => request<Session>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  cart: (token: string) => request<Cart>("/sales/cart/", {}, token),
  addCartItem: (token: string, variantId: string, quantity: number) => request<Cart>("/sales/cart/items", { method: "POST", body: JSON.stringify({ variant_id: variantId, quantity }) }, token),
  updateCartItem: (token: string, itemId: string, quantity: number) => request<Cart>(`/sales/cart/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) }, token),
  removeCartItem: (token: string, itemId: string) => request<Cart>(`/sales/cart/items/${itemId}`, { method: "DELETE" }, token),
  shipping: (destinationZipCode: string, variantId: string, quantity: number) => request<ShippingQuote[]>("/operations/shipping/calculate", { method: "POST", body: JSON.stringify({ destination_zip_code: destinationZipCode, items: [{ variant_id: variantId, quantity }] }) }),
  addresses: (token: string) => request<Address[]>("/addresses/", {}, token),
  preview: (token: string, addressId: string, couponCode?: string) => request<CheckoutPreview>("/sales/checkout/preview", { method: "POST", body: JSON.stringify({ address_id: addressId, coupon_code: couponCode || undefined }) }, token),
  mercadoPago: (token: string, input: CheckoutInput, idempotencyKey: string) => request<MercadoPagoCheckout>("/sales/checkout/mercado-pago", { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body: JSON.stringify(input) }, token),
  order: (token: string, orderId: string) => request<OrderStatus>(`/sales/orders/${orderId}`, {}, token),
};
