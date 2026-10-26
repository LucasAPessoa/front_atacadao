import { isAvailable } from "../../lib/product";
import { ApiError } from "../../services/client";
import type {
  Cart,
  PricingTier,
  Product,
  ProductImage,
  ProductQuestion,
  ProductReview,
  Variant,
} from "../../shared/types/domain";

export type Extras = {
  images: ProductImage[];
  tiers: PricingTier[];
  reviews: ProductReview[] | null;
  questions: ProductQuestion[] | null;
};
export type Loaded =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "ready"; product: Product; extras: Extras };

export type ProductApi = {
  product(id: string): Promise<Product>;
  productImages(id: string): Promise<ProductImage[]>;
  pricingTiers(id: string): Promise<PricingTier[]>;
  productReviews(id: string): Promise<ProductReview[]>;
  productQuestions(id: string): Promise<ProductQuestion[]>;
};

/** Produto é obrigatório (404/422 = não encontrado); os extras degradam sem derrubar a página. */
export async function loadProduct(
  id: string,
  api: ProductApi,
): Promise<Exclude<Loaded, { status: "loading" }>> {
  try {
    const [product, images, tiers, reviews, questions] = await Promise.all([
      api.product(id),
      api.productImages(id).catch(() => [] as ProductImage[]),
      api.pricingTiers(id).catch(() => [] as PricingTier[]),
      api.productReviews(id).catch(() => null),
      api.productQuestions(id).catch(() => null),
    ]);
    if (!product.is_active) return { status: "not-found" };
    return {
      status: "ready",
      product,
      extras: {
        images,
        tiers: [...tiers].sort((a, b) => a.min_quantity - b.min_quantity),
        reviews,
        questions: questions?.filter((item) => item.answer_text) ?? null,
      },
    };
  } catch (error) {
    return {
      status:
        error instanceof ApiError && [404, 422].includes(error.status) ? "not-found" : "error",
    };
  }
}

type AddDeps = {
  token: string;
  variant: Variant | undefined;
  quantity: number;
  addCartItem(token: string, variantId: string, quantity: number): Promise<Cart>;
  onLogin(): void;
  onCart(cart: Cart): void;
  onError(error: unknown): void;
};

/** Retorna true se o item foi adicionado. Sem token pede login; indisponível não chama a API. */
export async function addToCart(deps: AddDeps): Promise<boolean> {
  const { variant, token, quantity } = deps;
  if (!variant || !isAvailable(variant)) return false;
  if (!token) {
    deps.onLogin();
    return false;
  }
  try {
    deps.onCart(await deps.addCartItem(token, variant.id, Math.max(1, Math.floor(quantity))));
    return true;
  } catch (error) {
    deps.onError(error);
    return false;
  }
}
