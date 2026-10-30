import type { AdminVariant, PriceSource, PricingTableInput, PricingWarning } from "../../api/types";
import { normalizePrice } from "./price";

export const priceSourceLabels: Record<PriceSource, string> = {
  variant_link: "Preço próprio da variação",
  parent_link: "Herdado do produto pai",
  general: "Preço geral do Bling (sem preço da loja)",
};

export const noPriceSourceLabel = "Sem preço definido no Bling";
export const noPriceInstruction = "Informe o preço de 1 unidade e salve para liberar na loja.";

export const pricingStatusLabels = {
  pending: "Aguardando preços",
  confirmed: "Confirmado",
} as const;

export const warningLabels: Record<PricingWarning, string> = {
  tier_not_below_unit: "Há faixa com preço igual ou maior que o de 1 unidade.",
  store_price_missing: "A loja do site no Bling não tem preço para esta variação.",
  price_not_set: "Esta variação está sem preço definido.",
};

export const warningText = (warning: string) => warningLabels[warning as PricingWarning] ?? warning;

export type TierDraft = { key: string; min: string; price: string };

const cents = (value: string) => Math.round(Number(value) * 100);

/** Preço atual da linha de 1 unidade, como veio do servidor. */
export const currentUnitPrice = (variant: AdminVariant): string | null =>
  variant.pricing_tiers.find((tier) => tier.min_quantity === 1)?.unit_price ??
  variant.store_price ??
  null;

export type PricingCheck = { errors: string[]; input: PricingTableInput | null };

/** Valida antes de enviar; o servidor revalida e decide. */
export function validatePricing(unitText: string, drafts: TierDraft[]): PricingCheck {
  const errors: string[] = [];
  const unit = normalizePrice(unitText);
  if (!unit) errors.push("Preço de 1 unidade: informe um valor maior que zero, com até 2 casas.");
  const seen = new Set<number>();
  const tiers: PricingTableInput["tiers"] = [];
  drafts.forEach((draft, index) => {
    const label = `Faixa ${index + 1}`;
    const min = draft.min.trim();
    const quantity = /^\d+$/.test(min) ? Number(min) : Number.NaN;
    if (!Number.isInteger(quantity) || quantity < 2) {
      errors.push(`${label}: a quantidade mínima deve ser um inteiro a partir de 2.`);
    } else if (seen.has(quantity)) {
      errors.push(`${label}: já existe uma faixa a partir de ${quantity} unidades.`);
    } else seen.add(quantity);
    const price = normalizePrice(draft.price);
    if (!price) errors.push(`${label}: informe um preço maior que zero, com até 2 casas.`);
    else if (unit && cents(price) >= cents(unit))
      errors.push(`${label}: o preço deve ser menor que o de 1 unidade.`);
    if (price && Number.isInteger(quantity))
      tiers.push({ min_quantity: quantity, unit_price: price });
  });
  if (errors.length || !unit) return { errors, input: null };
  tiers.sort((a, b) => a.min_quantity - b.min_quantity);
  return { errors, input: { unit_price: unit, tiers } };
}
