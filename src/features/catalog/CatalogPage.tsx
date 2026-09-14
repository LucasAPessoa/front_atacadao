import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/client";
import { Cart, Category, Product } from "../../types/domain";
import { money } from "../../lib/format";

export function CatalogPage({ token, onLogin, onCart, onError }: { token: string; onLogin(): void; onCart(cart: Cart): void; onError(error: unknown): void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.products(), api.categories()])
      .then(([productList, categoryList]) => {
        setProducts(productList.filter((item) => item.is_active));
        setCategories(categoryList.filter((item) => item.is_active));
        setUnavailable(false);
      })
      .catch((error) => {
        setUnavailable(true);
        onError(error);
      })
      .finally(() => setLoading(false));
  }, [onError]);
  const visible = useMemo(() => products.filter((product) => {
    const matchesSearch = `${product.name} ${product.brand ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryId || product.categories.some((category) => category.id === categoryId);
    return matchesSearch && matchesCategory;
  }), [products, search, categoryId]);
  async function add(product: Product) { const variant = product.variants.find((item) => item.is_active); if (!variant) return; if (!token) return onLogin(); try { onCart(await api.addCartItem(token, variant.id)); } catch (error) { onError(error); } }
  return <>
    <section className="hero"><div><p className="eyebrow">COMPRE DO SEU JEITO</p><h1>Quantidade que rende<br /><em>mais para você.</em></h1><p>Produtos, entrega e pagamento em uma jornada simples e segura.</p><button className="primary" onClick={() => document.getElementById("catalog")?.scrollIntoView()}>Ver produtos →</button></div><div className="hero-art" aria-hidden="true"><strong>COMPRA<br />SIMPLES,<br />ESCOLHA BOA</strong></div></section>
    <section className="catalog" id="catalog"><div className="section-heading"><div><p className="eyebrow">PRODUTOS</p><h2>Encontre o que precisa</h2></div><label className="search compact"><span aria-hidden="true">⌕</span><input aria-label="Buscar produtos" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produtos" /></label></div><div className="category-chips"><button className={!categoryId ? "active" : ""} onClick={() => setCategoryId("")}>Todos</button>{categories.map((item) => <button className={categoryId === item.id ? "active" : ""} onClick={() => setCategoryId(item.id)} key={item.id}>{item.name}</button>)}</div>{loading ? <div className="state-panel" role="status">Carregando produtos…</div> : unavailable ? <div className="state-panel" role="alert">A loja está indisponível agora. Atualize a página para tentar novamente.</div> : <><div className="product-grid">{visible.map((product, index) => <article className={`product-card shade-${index % 4}`} key={product.id}><div className="product-image"><span>{product.name.slice(0, 2).toUpperCase()}</span></div><div className="product-meta"><p>{product.brand || "Seleção Atacadão"}</p><h3>{product.name}</h3><span>{product.variants.find((v) => v.is_active)?.variation_name || "Indisponível"}</span><strong>a partir de {money(product.variants.find((v) => v.is_active)?.base_price ?? 0)}</strong><button className="add-button" onClick={() => add(product)}>Adicionar ao carrinho</button></div></article>)}</div>{!visible.length && <div className="state-panel">Nenhum produto corresponde à busca ou à categoria escolhida.</div>}</>}</section>
  </>;
}
