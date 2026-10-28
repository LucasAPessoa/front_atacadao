import type { Category, PricingTier, Product, ProductImage, Variant } from "../shared/types/domain";

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
export const applicableTier = (tiers: PricingTier[], quantity: number): PricingTier | undefined =>
  [...tiers]
    .filter((tier) => tier.min_quantity <= quantity)
    .sort((a, b) => b.min_quantity - a.min_quantity)[0];

/** Faixas exibíveis: a faixa 1 é o preço base da variação (o servidor só guarda faixas acima de 1). */
export const tierRows = (basePrice: string, tiers: PricingTier[]): PricingTier[] => {
  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  if (sorted.some((tier) => tier.min_quantity <= 1)) return sorted;
  return [{ id: "base", product_id: "", min_quantity: 1, unit_price: basePrice }, ...sorted];
};

/** Primeira faixa acima da quantidade. Só exibição. */
export const nextTier = (rows: PricingTier[], quantity: number): PricingTier | undefined =>
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
