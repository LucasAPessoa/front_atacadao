import type { PendingReason } from "../../api/types";

/** Formata uma string decimal ("1234.50") em BRL sem passar por número de ponto flutuante. */
export function formatBRL(value: string | null | undefined): string {
  if (!value || !/^-?\d+(\.\d+)?$/.test(value)) return "—";
  const negative = value.startsWith("-");
  const [int, frac = ""] = value.replace("-", "").split(".");
  const grouped = int.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}R$ ${grouped},${frac.padEnd(2, "0").slice(0, 2)}`;
}

export function formatPriceRange(min: string, max: string): string {
  return min === max ? formatBRL(min) : `${formatBRL(min)} – ${formatBRL(max)}`;
}

export const pendingLabels: Record<PendingReason, string> = {
  INCOMPLETE_WEIGHT: "Sem peso",
  INCOMPLETE_DIMENSIONS: "Sem medidas",
  INCOMPLETE_PRICE: "Preço zero",
  PRICE_NOT_SET: "Sem preço (Bling e loja)",
  STORE_PRICE_MISSING: "Sem preço na loja do Bling (usando preço geral)",
  TIER_NOT_BELOW_UNIT: "Faixa igual ou acima do preço de 1 unidade",
};
