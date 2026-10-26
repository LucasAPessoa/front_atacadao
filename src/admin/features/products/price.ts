import { z } from "zod";

const PRICE_PATTERN = /^\d+([.,]\d{1,2})?$/;

/** Preço digitado (aceita vírgula) -> string "19.90" para a API; `null` se inválido. */
export function normalizePrice(text: string): string | null {
  const value = text.trim();
  if (!PRICE_PATTERN.test(value)) return null;
  const [int = "0", cents = ""] = value.replace(",", ".").split(".");
  const normalized = `${int.replace(/^0+(?=\d)/, "")}.${cents.padEnd(2, "0")}`;
  return Number(normalized) > 0 ? normalized : null;
}

export const PRICE_MESSAGE = "Informe um valor maior que zero, com até 2 casas decimais.";

export const priceField = z.string().refine((v) => normalizePrice(v) !== null, PRICE_MESSAGE);
