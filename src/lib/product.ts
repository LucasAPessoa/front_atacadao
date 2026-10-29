import type { Category, Product, ProductImage, Variant, VariantTier } from "../shared/types/domain";

export const productPath = (id: string) => `/produtos/${encodeURIComponent(id)}`;

/** Extrai o id de `/produtos/:id`; null para qualquer outro caminho. */
export const productIdFromPath = (path: string): string | null => {
  const match = /^\/produtos\/([^/]+)\/?$/.exec(path);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
};

export const isAvailable = (variant: Variant) => variant.is_active && variant.stock_quantity > 0;

/** Variação inicial: a primeira disponível; senão a primeira ativa; senão a primeira. */
export const defaultVariant = (variants: Variant[]): Variant | undefined =>
  variants.find(isAvailable) ?? variants.find((item) => item.is_active) ?? variants[0];

/** Faixa de maior min_quantity que não excede a quantidade. Só exibição: o servidor decide o preço. */
export const applicableTier = (tiers: VariantTier[], quantity: number): VariantTier | undefined =>
  [...tiers]
    .filter((tier) => tier.min_quantity <= quantity)
    .sort((a, b) => b.min_quantity - a.min_quantity)[0];

/** Preço de 1 unidade da variação: `unit_price` do servidor (cai em base_price só em respostas antigas). */
export const variantUnitPrice = (variant: Variant): string =>
  variant.unit_price ?? variant.base_price;

/**
 * Tabela exibível da variação: a linha de 1 unidade e as faixas dela (nunca de outra variação).
 * Só exibição: o servidor decide o preço.
 */
export const tierRows = (variant: Variant): VariantTier[] => {
  const sorted = [...(variant.pricing_tiers ?? [])].sort((a, b) => a.min_quantity - b.min_quantity);
  if (sorted.some((tier) => tier.min_quantity <= 1)) return sorted;
  return [
    { id: `base-${variant.id}`, min_quantity: 1, unit_price: variantUnitPrice(variant) },
    ...sorted,
  ];
};

/**
 * Faixa aplicada a um item do carrinho: a de maior quantidade mínima, até a quantidade do item, cujo `unit_price` coincide com o do item,
 * quando não é a linha de 1 unidade. Sem faixa (ou preço de 1 unidade) devolve undefined.
 */
export const appliedTier = (
  variant: Variant,
  itemUnitPrice?: string,
  quantity = Number.POSITIVE_INFINITY,
): VariantTier | undefined => {
  if (itemUnitPrice === undefined) return undefined;
  const rows = tierRows(variant);
  const match = rows
    .filter(
      (tier) => Number(tier.unit_price) === Number(itemUnitPrice) && tier.min_quantity <= quantity,
    )
    .sort((a, b) => b.min_quantity - a.min_quantity)[0];
  return match && match.min_quantity > 1 ? match : undefined;
};

/** Primeira faixa acima da quantidade. Só exibição. */
export const nextTier = (rows: VariantTier[], quantity: number): VariantTier | undefined =>
  [...rows]
    .filter((tier) => tier.min_quantity > quantity)
    .sort((a, b) => a.min_quantity - b.min_quantity)[0];

/** Imagens da variação escolhida; sem nenhuma, as do produto. Principal primeiro. */
export const galleryImages = (images: ProductImage[], variantId?: string): ProductImage[] => {
  const own = variantId ? images.filter((image) => image.variant_id === variantId) : [];
  const list = own.length ? own : images;
  return [...list].sort((a, b) => Number(b.is_main) - Number(a.is_main));
};

/** Mantém a quantidade entre 1 e o estoque exibido (mínimo 1). */
export const clampQuantity = (value: number, stock: number) => {
  const whole = Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.max(1, Math.min(whole, Math.max(stock, 1)));
};

/** Só http/https ou caminho relativo; qualquer outro esquema vira placeholder. */
export const safeImageUrl = (url: string | null | undefined): string | null => {
  const value = (url ?? "").trim();
  if (!value) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.startsWith("/")) return value;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
};

type ClickLike = {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  preventDefault(): void;
};

/** Clique simples navega sem recarregar; ctrl/cmd/shift/alt/botão do meio seguem o href real. */
export function handleLinkClick(event: ClickLike, path: string, go: (path: string) => void) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return false;
  event.preventDefault();
  go(path);
  return true;
}

/** Produto exibível na vitrine: ativo e com ao menos uma variação ativa. */
export const isDisplayable = (product: Product) =>
  product.is_active && product.variants.some((variant) => variant.is_active);

/** Departamentos ativos com ao menos um produto exibível. */
export const departmentsWithProducts = (
  categories: Category[],
  products: Product[],
): Category[] => {
  const used = new Set(
    products.filter(isDisplayable).flatMap((product) => product.categories.map((c) => c.id)),
  );
  return categories.filter((category) => category.is_active && used.has(category.id));
};

/** Departamento oculto ou inexistente vira "" (Todos). */
export const effectiveCategoryId = (categoryId: string, departments: Category[]) =>
  departments.some((category) => category.id === categoryId) ? categoryId : "";

/** Plural simples em português: só a primeira palavra varia ("fardo 5kg" vira "fardos 5kg"). */
export const packPlural = (name: string, count = 2) => {
  const [head = "unidade", ...rest] = (name.trim() || "unidade").toLowerCase().split(/\s+/);
  const plural =
    count === 1
      ? head
      : head.endsWith("ão")
        ? `${head.slice(0, -2)}ões`
        : head.endsWith("l")
          ? `${head.slice(0, -1)}is`
          : head.endsWith("s")
            ? head
            : /[rz]$/.test(head)
              ? `${head}es`
              : `${head}s`;
  return [plural, ...rest].join(" ");
};

export type StockConflict = { message: string; available: number };

/** 409 de estoque do carrinho (`{"detail", "available"}`); qualquer outro erro devolve null. */
export const stockConflict = (error: unknown): StockConflict | null => {
  const { status, available, message } = (error ?? {}) as {
    status?: number;
    available?: number;
    message?: string;
  };
  if (status !== 409 || typeof available !== "number") return null;
  return { message: message || "Estoque insuficiente para essa quantidade.", available };
};
