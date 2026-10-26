import type { CheckoutPreview } from "../shared/types/domain";

type ShippingOption = CheckoutPreview["shipping_options"][number];

export function formatZip(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : value;
}

export function formatDeliveryTime(days?: number | null): string | null {
  if (days === undefined || days === null || days < 0) return null;
  return `até ${days} ${days === 1 ? "dia útil" : "dias úteis"}`;
}

// Remove só o ponto inicial vindo da transportadora (".Package" -> "Package").
export function cleanServiceName(name?: string | null): string {
  return (name ?? "").replace(/^\.+/, "").replace(/\s+/g, " ").trim();
}

export function shippingLabel(option: Pick<ShippingOption, "company_name" | "service_name">) {
  return [option.company_name?.trim(), cleanServiceName(option.service_name)]
    .filter(Boolean)
    .join(" ");
}

export function cartItemName(productName: string | undefined, variationName: string): string {
  return productName ? `${productName} · ${variationName}` : variationName;
}

// Valores vêm da API: frete = price, total = total_amount (servidor é a autoridade).
export function summaryAmounts(
  productsAmount: string | number,
  option?: Pick<ShippingOption, "price" | "total_amount"> | null,
) {
  if (!option) return { products: productsAmount, shipping: null, total: null };
  return { products: productsAmount, shipping: option.price, total: option.total_amount };
}
