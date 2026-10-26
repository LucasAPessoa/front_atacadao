import { useEffect, useMemo, useState } from "react";
import { ProductThumb } from "../../components/ProductThumb";
import { navigate } from "../../components/Layout";
import { money } from "../../lib/format";
import {
  departmentsWithProducts,
  effectiveCategoryId,
  handleLinkClick,
  isDisplayable,
  productPath,
} from "../../lib/product";
import { api } from "../../services/client";
import type { Cart, Category, Product } from "../../types/domain";

type Props = {
  token: string;
  onLogin(): void;
  onCart(cart: Cart): void;
  onError(error: unknown): void;
  mode: "home" | "catalog";
  query: string;
};
export function CatalogPage({ token, onLogin, onCart, onError, mode, query }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [allCategories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [adding, setAdding] = useState("");
  useEffect(() => {
    setLoading(true);
    Promise.all([api.products(), api.categories()])
      .then(([list, categoryList]) => {
        setProducts(list.filter(isDisplayable));
        setCategories(categoryList);
        setUnavailable(false);
      })
      .catch((error) => {
        setUnavailable(true);
        onError(error);
      })
      .finally(() => setLoading(false));
  }, [onError]);
  useEffect(() => {
    if (mode === "catalog") {
      const params = new URLSearchParams(query);
      setCategoryId(params.get("categoria") ?? "");
      setSearch(params.get("busca") ?? "");
    }
  }, [mode, query]);
  const selectCategory = (id: string) => {
    const params = new URLSearchParams();
    if (id) params.set("categoria", id);
    if (search.trim()) params.set("busca", search.trim());
    navigate(`/produtos${params.size ? `?${params.toString()}` : ""}`);
  };
  const categories = useMemo(
    () => departmentsWithProducts(allCategories, products),
    [allCategories, products],
  );
  const categoryId = effectiveCategoryId(selectedCategoryId, categories);
  const visible = useMemo(
    () =>
      products.filter(
        (product) =>
          `${product.name} ${product.brand ?? ""} ${product.description ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (!categoryId || product.categories.some((category) => category.id === categoryId)),
      ),
    [products, search, categoryId],
  );
  const add = async (product: Product) => {
    const variant = product.variants.find((item) => item.is_active && item.stock_quantity > 0);
    if (!variant) return;
    if (!token) return onLogin();
    setAdding(product.id);
    try {
      onCart(await api.addCartItem(token, variant.id));
    } catch (error) {
      onError(error);
    } finally {
      setAdding("");
    }
  };
  const openProduct = (event: React.MouseEvent<HTMLAnchorElement>, id: string) =>
    handleLinkClick(event, productPath(id), navigate);
  const ProductGrid = () => (
    <>
      {loading ? (
        <div className="state-panel" role="status">
          Carregando produtos e condições comerciais…
        </div>
      ) : unavailable ? (
        <div className="state-panel" role="alert">
          Não foi possível abrir o catálogo agora. Atualize a página para tentar novamente.
        </div>
      ) : (
        <>
          <ul className="product-grid">
            {visible.map((product) => {
              const variant = product.variants.find(
                (item) => item.is_active && item.stock_quantity > 0,
              );
              const unavailableProduct = !variant;
              return (
                <li className="product-card" key={product.id}>
                  <div className="product-top">
                    <span>{product.categories[0]?.name ?? "Seleção"}</span>
                    <span>{product.brand || "Seleção"}</span>
                  </div>
                  <a
                    className="product-image"
                    href={productPath(product.id)}
                    tabIndex={-1}
                    aria-label={`Ver detalhes de ${product.name}`}
                    onClick={(event) => openProduct(event, product.id)}
                  >
                    <ProductThumb name={product.name} src={product.main_image_url} />
                  </a>
                  <h3 className="product-name">
                    <a
                      href={productPath(product.id)}
                      onClick={(event) => openProduct(event, product.id)}
                    >
                      {product.name}
                    </a>
                  </h3>
                  <span className="product-unit">
                    {variant?.variation_name ?? "Indisponível no momento"}
                  </span>
                  <div className="product-buy">
                    <span className="product-price">
                      {variant ? money(variant.base_price) : "—"}
                      <small>valor unitário</small>
                    </span>
                    <button
                      type="button"
                      className="product-add"
                      disabled={unavailableProduct || adding === product.id}
                      onClick={() => add(product)}
                      aria-label={
                        unavailableProduct
                          ? `${product.name} indisponível`
                          : `Adicionar ${product.name} ao carrinho`
                      }
                    >
                      {adding === product.id ? "…" : "+"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {!visible.length && (
            <div className="state-panel">
              <h2>Nenhum item encontrado</h2>
              <p>Ajuste a busca ou escolha outra categoria.</p>
            </div>
          )}
        </>
      )}
    </>
  );
  const hasCategories = categories.length > 0;
  return (
    <>
      {mode === "home" && (
        <>
          <section className="home-hero" aria-label="Destaque">
            <div className="wrap">
              <p className="meta-line">
                <span>Compra em quantidade</span>
                <span>Entrega calculada antes de pagar</span>
                <span>Valores confirmados pelo servidor</span>
              </p>
              <h1 className="hero-title">
                O essencial
                <br />
                para a sua
                <br />
                rotina<span className="dot">.</span>
              </h1>
              <div className="hero-foot">
                <p>
                  Escolha produtos, monte seu pedido e veja a entrega antes de seguir para o
                  pagamento.
                </p>
                <div className="hero-actions">
                  <button
                    type="button"
                    className="primary hero-cta"
                    onClick={() => document.getElementById("destaques")?.scrollIntoView()}
                  >
                    Ver produtos <span aria-hidden="true">→</span>
                  </button>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => navigate("/produtos")}
                  >
                    Ver catálogo completo
                  </button>
                </div>
              </div>
            </div>
          </section>
          {hasCategories && (
            <section className="block" aria-labelledby="departamentos">
              <div className="wrap">
                <div className="block-head">
                  <h2 id="departamentos">
                    <span className="num">01</span>Departamentos
                  </h2>
                  <button type="button" className="mono-link" onClick={() => navigate("/produtos")}>
                    Todos os produtos →
                  </button>
                </div>
                <ol className="department-list">
                  {categories.map((category, index) => (
                    <li key={category.id}>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/produtos?categoria=${encodeURIComponent(category.id)}`)
                        }
                      >
                        <span>
                          <span className="idx">{String(index + 1).padStart(2, "0")}</span>
                          {category.name}
                        </span>
                        <span aria-hidden="true">↗</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}
        </>
      )}
      <section className="block catalog" id="destaques" aria-labelledby="titulo-produtos">
        <div className="wrap">
          {mode === "catalog" && (
            <nav className="breadcrumbs" aria-label="Você está em">
              <button type="button" onClick={() => navigate("/")}>
                Início
              </button>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Catálogo</span>
            </nav>
          )}
          <div className="block-head">
            <h2 id="titulo-produtos">
              {mode === "home" ? (
                <>
                  <span className="num">{hasCategories ? "02" : "01"}</span>Mais procurados
                </>
              ) : (
                "Produtos"
              )}
            </h2>
            {mode === "home" ? (
              <button type="button" className="mono-link" onClick={() => navigate("/produtos")}>
                Catálogo completo →
              </button>
            ) : (
              <p className="catalog-count">{visible.length} produtos encontrados</p>
            )}
          </div>
          {mode === "catalog" && (
            <div className="catalog-layout">
              <aside className="filter-side">
                <label className="catalog-search">
                  <span>Busca</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="O que você procura?"
                  />
                </label>
                <section className="filter-row" aria-label="Filtros de categoria">
                  <button
                    type="button"
                    className={!categoryId ? "active" : ""}
                    aria-pressed={!categoryId}
                    onClick={() => selectCategory("")}
                  >
                    Todos os departamentos
                  </button>
                  {categories.map((item) => (
                    <button
                      type="button"
                      className={categoryId === item.id ? "active" : ""}
                      aria-pressed={categoryId === item.id}
                      onClick={() => selectCategory(item.id)}
                      key={item.id}
                    >
                      {item.name}
                    </button>
                  ))}
                </section>
              </aside>
              <div>
                <ProductGrid />
              </div>
            </div>
          )}
          {mode === "home" && <ProductGrid />}
        </div>
      </section>
      {mode === "home" && (
        <>
          <section className="block" aria-label="Vantagens">
            <div className="wrap benefits">
              <article>
                <span className="big-num">01</span>
                <strong>Compra protegida</strong>
                <p>Você revisa valores antes de seguir para o pagamento.</p>
              </article>
              <article>
                <span className="big-num">02</span>
                <strong>Frete recalculado</strong>
                <p>O servidor confirma a entrega para o seu endereço.</p>
              </article>
              <article>
                <span className="big-num">03</span>
                <strong>Pedido acompanhável</strong>
                <p>O status fica disponível na sua conta.</p>
              </article>
            </div>
          </section>
          <section className="block" id="como-funciona" aria-labelledby="como">
            <div className="wrap">
              <div className="block-head">
                <h2 id="como">
                  <span className="num">{hasCategories ? "03" : "02"}</span>Como funciona
                </h2>
              </div>
              <ol className="steps">
                <li>
                  <span className="idx">01</span>
                  <strong>Monte seu carrinho</strong>
                  <p>Escolha itens e ajuste quantidades.</p>
                </li>
                <li>
                  <span className="idx">02</span>
                  <strong>Escolha a entrega</strong>
                  <p>O frete é recalculado pelo servidor.</p>
                </li>
                <li>
                  <span className="idx">03</span>
                  <strong>Pague com segurança</strong>
                  <p>O Mercado Pago cuida dos dados de pagamento.</p>
                </li>
              </ol>
            </div>
          </section>
        </>
      )}
    </>
  );
}
