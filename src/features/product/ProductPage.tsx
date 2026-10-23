import { useCallback, useEffect, useRef, useState } from "react";
import { navigate } from "../../components/Layout";
import { money } from "../../lib/format";
import {
  applicableTier,
  clampQuantity,
  defaultVariant,
  galleryImages,
  handleLinkClick,
  isAvailable,
  safeImageUrl,
} from "../../lib/product";
import { api } from "../../services/client";
import type { Cart, Product } from "../../types/domain";
import { addToCart, type Extras, type Loaded, loadProduct } from "./loader";

type PageProps = {
  id: string;
  token: string;
  onLogin(): void;
  onCart(cart: Cart): void;
  onError(error: unknown): void;
};

function AppLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={to} className={className} onClick={(event) => handleLinkClick(event, to, navigate)}>
      {children}
    </a>
  );
}

export function ProductStateView({
  kind,
  onRetry,
}: {
  kind: "loading" | "not-found" | "error";
  onRetry?(): void;
}) {
  if (kind === "loading")
    return (
      <section className="state-page" role="status">
        <p>Carregando produto…</p>
      </section>
    );
  const notFound = kind === "not-found";
  return (
    <section className="state-page" role={notFound ? undefined : "alert"}>
      <p className="eyebrow">{notFound ? "404 · PRODUTO NÃO ENCONTRADO" : "ERRO DE CONEXÃO"}</p>
      <h1>{notFound ? "Esse produto não existe." : "Não foi possível abrir o produto."}</h1>
      <p>
        {notFound
          ? "Ele pode ter saído do catálogo. Volte para ver os outros itens."
          : "Verifique sua conexão e tente novamente."}
      </p>
      <div className="pdp-actions">
        {!notFound && (
          <button type="button" className="primary" onClick={onRetry}>
            Tentar novamente
          </button>
        )}
        <AppLink to="/produtos" className={notFound ? "primary" : "link-button"}>
          Voltar ao catálogo
        </AppLink>
      </div>
    </section>
  );
}

type ViewProps = {
  product: Product;
  extras: Extras;
  variantId: string;
  quantity: number;
  imageId: string;
  adding: boolean;
  message: string;
  onVariant(id: string): void;
  onQuantity(value: number): void;
  onImage(id: string): void;
  onAdd(): void;
};

function QuantityField({
  quantity,
  stock,
  disabled,
  onQuantity,
}: {
  quantity: number;
  stock: number;
  disabled: boolean;
  onQuantity(value: number): void;
}) {
  const [draft, setDraft] = useState(String(quantity));
  return (
    <label className="pdp-qty">
      <span>Quantidade</span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={Math.max(stock, 1)}
        value={draft}
        disabled={disabled}
        onChange={(event) => {
          setDraft(event.target.value);
          if (event.target.value !== "")
            onQuantity(clampQuantity(Number(event.target.value), stock));
        }}
        onBlur={() => {
          const next = clampQuantity(draft === "" ? 1 : Number(draft), stock);
          setDraft(String(next));
          onQuantity(next);
        }}
      />
    </label>
  );
}

const stars = (rating: number) => "★".repeat(rating) + "☆".repeat(Math.max(0, 5 - rating));

export function ProductView({
  product,
  extras,
  variantId,
  quantity,
  imageId,
  adding,
  message,
  onVariant,
  onQuantity,
  onImage,
  onAdd,
}: ViewProps) {
  const variants = product.variants;
  const variant = variants.find((item) => item.id === variantId) ?? defaultVariant(variants);
  const available = Boolean(variant && isAvailable(variant));
  const images = galleryImages(extras.images, variant?.id);
  const mainImage = images.find((item) => item.id === imageId) ?? images[0];
  const mainSrc = safeImageUrl(mainImage?.image_url);
  const titleRef = useRef<HTMLHeadingElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: foco só ao abrir outro produto.
  useEffect(() => titleRef.current?.focus(), [product.id]);
  const tier = applicableTier(extras.tiers, quantity);
  const category = product.categories[0]?.name;
  return (
    <article className="pdp wrap">
      <nav className="breadcrumbs" aria-label="Você está em">
        <AppLink to="/">Início</AppLink>
        <span aria-hidden="true">/</span>
        <AppLink to="/produtos">Catálogo</AppLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>
      <div className="pdp-main">
        <section className="pdp-gallery" aria-label="Imagens do produto">
          <div className="pdp-image">
            {mainSrc ? (
              <img src={mainSrc} alt={product.name} />
            ) : (
              <span aria-hidden="true">{product.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          {images.length > 1 && (
            <ul className="pdp-thumbs">
              {images.map((image, index) => {
                const thumb = safeImageUrl(image.image_url);
                return (
                  <li key={image.id}>
                    <button
                      type="button"
                      aria-label={`Ver imagem ${index + 1} de ${images.length}`}
                      aria-pressed={image.id === mainImage?.id}
                      onClick={() => onImage(image.id)}
                    >
                      {thumb && <img src={thumb} alt="" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <div className="pdp-info">
          <p className="meta-line">
            <span>{category ?? "Seleção"}</span>
            <span>{product.brand || "Seleção"}</span>
          </p>
          <h1 className="pdp-title" ref={titleRef} tabIndex={-1}>
            {product.name}
          </h1>
          {product.description && <p className="pdp-description">{product.description}</p>}
          <p className="pdp-price">
            {variant ? money(variant.base_price) : "—"}
            <small>valor unitário · confirmado pelo servidor no carrinho</small>
          </p>
          {variants.length > 0 && (
            <fieldset className="pdp-variants">
              <legend>Variação</legend>
              {variants.map((item) => {
                const ok = isAvailable(item);
                return (
                  <label key={item.id} className={item.id === variant?.id ? "active" : ""}>
                    <input
                      type="radio"
                      name="variant"
                      value={item.id}
                      checked={item.id === variant?.id}
                      onChange={() => onVariant(item.id)}
                    />
                    <span>{item.variation_name}</span>
                    <span>{money(item.base_price)}</span>
                    <span className={ok ? "pdp-stock" : "pdp-stock out"}>
                      {ok ? "Disponível" : "Indisponível"}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}
          {extras.tiers.length > 0 && (
            <section className="pdp-tiers" aria-labelledby="pdp-tiers-title">
              <h2 id="pdp-tiers-title">Preço por quantidade</h2>
              <table>
                <thead>
                  <tr>
                    <th scope="col">A partir de</th>
                    <th scope="col">Preço unitário</th>
                  </tr>
                </thead>
                <tbody>
                  {extras.tiers.map((item) => (
                    <tr
                      key={item.id}
                      className={item.id === tier?.id ? "active" : ""}
                      aria-current={item.id === tier?.id ? "true" : undefined}
                    >
                      <td>{item.min_quantity} un.</td>
                      <td>
                        {money(item.unit_price)}
                        {item.id === tier?.id && <span> · sua faixa</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="pdp-note">
                Exibição informativa; o valor final é calculado pelo servidor.
              </p>
            </section>
          )}
          <div className="pdp-buy">
            <QuantityField
              key={variant?.id}
              quantity={quantity}
              stock={variant?.stock_quantity ?? 1}
              disabled={!available}
              onQuantity={onQuantity}
            />
            <button
              type="button"
              className="primary"
              disabled={!available || adding}
              onClick={onAdd}
            >
              {!available ? "Indisponível" : adding ? "Adicionando…" : "Adicionar ao carrinho"}
            </button>
          </div>
          <p className="pdp-feedback" role="status" aria-live="polite">
            {message}
          </p>
        </div>
      </div>
      <section className="pdp-section" aria-labelledby="pdp-reviews">
        <h2 id="pdp-reviews">Avaliações</h2>
        {extras.reviews === null ? (
          <p>Não foi possível carregar as avaliações agora.</p>
        ) : extras.reviews.length === 0 ? (
          <p>Este produto ainda não tem avaliações.</p>
        ) : (
          <ul className="pdp-list">
            {extras.reviews.map((review) => (
              <li key={review.id}>
                <p className="pdp-stars">
                  <span aria-hidden="true">{stars(review.rating)}</span>
                  <span className="sr-only">Nota {review.rating} de 5</span>
                </p>
                {review.comment && <p>{review.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="pdp-section" aria-labelledby="pdp-questions">
        <h2 id="pdp-questions">Perguntas e respostas</h2>
        {extras.questions === null ? (
          <p>Não foi possível carregar as perguntas agora.</p>
        ) : extras.questions.length === 0 ? (
          <p>Nenhuma pergunta respondida ainda.</p>
        ) : (
          <ul className="pdp-list">
            {extras.questions.map((question) => (
              <li key={question.id}>
                <p>
                  <strong>Pergunta:</strong> {question.question_text}
                </p>
                <p>
                  <strong>Resposta:</strong> {question.answer_text}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <AppLink to="/produtos" className="link-button">
        ← Voltar ao catálogo
      </AppLink>
    </article>
  );
}

export function ProductPage({ id, token, onLogin, onCart, onError }: PageProps) {
  const [state, setState] = useState<Loaded>({ status: "loading" });
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [imageId, setImageId] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: "loading" });
    setMessage("");
    setQuantity(1);
    setImageId("");
    loadProduct(id, api).then((next) => {
      if (cancelled) return;
      if (next.status === "ready") setVariantId(defaultVariant(next.product.variants)?.id ?? "");
      setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);
  useEffect(() => load(), [load]);
  if (state.status !== "ready")
    return <ProductStateView kind={state.status} onRetry={() => void load()} />;
  const variant = state.product.variants.find((item) => item.id === variantId);
  const add = async () => {
    setAdding(true);
    setMessage("");
    const ok = await addToCart({
      token,
      variant,
      quantity,
      addCartItem: api.addCartItem,
      onLogin,
      onCart,
      onError,
    });
    if (ok && variant)
      setMessage(
        `${quantity} × ${state.product.name} (${variant.variation_name}) adicionado ao carrinho.`,
      );
    setAdding(false);
  };
  return (
    <ProductView
      product={state.product}
      extras={state.extras}
      variantId={variantId}
      quantity={quantity}
      imageId={imageId}
      adding={adding}
      message={message}
      onVariant={(next) => {
        setVariantId(next);
        setImageId("");
        setQuantity(1);
      }}
      onQuantity={setQuantity}
      onImage={setImageId}
      onAdd={add}
    />
  );
}
