import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { navigate } from "../lib/navigation";
import { store } from "../shared/store-config";
import { brandTokens } from "../shared/theme";
import type { User } from "../shared/types/domain";
import { AppLink } from "./AppLink";
import { useStoreTheme } from "./StoreTheme";
import { useDepartments } from "./useDepartments";

export { navigate };

export function themeStyleFor(brand: string) {
  const tokens = brandTokens(brand);
  return {
    "--brand": tokens.brand,
    "--on-brand": tokens.onBrand,
    "--brand-text": tokens.brandText,
  } as React.CSSProperties;
}

type LayoutProps = {
  children: ReactNode;
  user: User | null;
  cartCount: number;
  onLogout(destination?: string): void;
  path: string;
  /** `location.search` atual: a busca do cabeçalho acompanha `?busca=`. */
  query?: string;
};

/** Destino da busca: no catálogo mantém o departamento escolhido. */
export function searchTarget(term: string, path: string, query: string) {
  const current = new URLSearchParams(query);
  const params = new URLSearchParams();
  const categoria = path === "/produtos" ? current.get("categoria") : null;
  if (categoria) params.set("categoria", categoria);
  if (term.trim()) params.set("busca", term.trim());
  return `/produtos${params.size ? `?${params}` : ""}`;
}

export function Layout({ children, user, cartCount, onLogout, path, query = "" }: LayoutProps) {
  const { brand } = useStoreTheme();
  const themeStyle = useMemo(() => themeStyleFor(brand), [brand]);
  const [menuOpen, setMenuOpen] = useState(false);
  const authRoute = path === "/entrar" || path === "/cadastro";
  const urlTerm = new URLSearchParams(query).get("busca") ?? "";
  const [headerSearch, setHeaderSearch] = useState(urlTerm);
  // URL → campo: voltar/avançar, departamento ou "limpar busca" atualizam o texto.
  useEffect(() => setHeaderSearch(urlTerm), [urlTerm]);
  const departments = useDepartments();
  const activeCategory = path === "/produtos" ? new URLSearchParams(query).get("categoria") : null;
  // No catálogo, trocar de departamento mantém a busca.
  const chipHref = (id: string) => {
    const params = new URLSearchParams();
    if (id) params.set("categoria", id);
    const term = path === "/produtos" ? urlTerm : "";
    if (term) params.set("busca", term);
    return `/produtos${params.size ? `?${params}` : ""}`;
  };
  // Qualquer navegação fecha o menu.
  const location = `${path}${query}`;
  useEffect(() => {
    if (location) setMenuOpen(false);
  }, [location]);
  // Troca de página (não de busca nem de chip): foco no conteúdo, para o leitor de tela
  // não ficar perdido no menu que fechou. A primeira renderização não rouba o foco.
  const previousPath = useRef(path);
  useEffect(() => {
    if (previousPath.current === path) return;
    previousPath.current = path;
    if (!window.location.hash) document.getElementById("conteudo")?.focus({ preventScroll: true });
  }, [path]);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButton.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  const header = useRef<HTMLElement>(null);
  // Âncoras param abaixo do cabeçalho fixo: --header-h acompanha a altura real dele.
  useEffect(() => {
    // O cabeçalho some em /entrar e /cadastro: ao voltar, mede e observa o novo.
    if (authRoute) return;
    const element = header.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const sync = () =>
      document.documentElement.style.setProperty("--header-h", `${element.offsetHeight}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    return () => observer.disconnect();
  }, [authRoute]);
  const isAdmin = user?.role.name === "admin";
  const closeMenu = () => setMenuOpen(false);
  const submitSearch = () => {
    closeMenu();
    navigate(searchTarget(headerSearch, path, query));
  };
  const hasLegal = Boolean(store.legalName || store.cnpj || store.address);

  if (authRoute)
    return (
      <main id="conteudo" className="auth-layout" style={themeStyle} tabIndex={-1}>
        {children}
      </main>
    );

  return (
    <div className="page-shell" style={themeStyle}>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <div className="announcement">{store.announcement}</div>
      <header className="site-header" ref={header}>
        <div className="header-inner">
          <AppLink href="/" className="brand" aria-label={`Ir para ${store.name}`}>
            <span className="brand-mark" aria-hidden="true" />
            <span>{store.name}</span>
          </AppLink>
          <search className="header-search-landmark">
            <form
              className="header-search"
              onSubmit={(event) => {
                event.preventDefault();
                submitSearch();
              }}
            >
              <label htmlFor="busca-header">Busca</label>
              <input
                id="busca-header"
                type="search"
                name="busca"
                enterKeyHint="search"
                value={headerSearch}
                onChange={(event) => setHeaderSearch(event.target.value)}
                placeholder="Buscar produtos"
              />
              <button type="submit">Buscar</button>
            </form>
          </search>
          <div className="header-actions">
            <a className="header-cell support-action" href={`mailto:${store.supportEmail}`}>
              Ajuda
            </a>
            {user ? (
              <AppLink
                href="/conta"
                className="header-cell"
                current={path === "/conta"}
                aria-label="Minha conta"
              >
                <svg
                  className="hc-icon"
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="hc-label">Conta</span>
              </AppLink>
            ) : (
              <AppLink href="/entrar" className="header-cell" aria-label="Entrar">
                <svg
                  className="hc-icon"
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="hc-label">Entrar</span>
              </AppLink>
            )}
            <AppLink
              href="/carrinho"
              className="cart-button"
              current={path === "/carrinho"}
              aria-label={`Carrinho, ${cartCount} ${cartCount === 1 ? "item" : "itens"}`}
            >
              <svg
                className="hc-icon"
                viewBox="0 0 24 24"
                width="22"
                height="22"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M3 4h2l2.4 11h10.2L20 7H6M9 20h.01M17 20h.01"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="hc-label">Carrinho</span>{" "}
              {cartCount > 0 && (
                <span className="cart-count" aria-hidden="true">
                  · {cartCount}
                </span>
              )}
            </AppLink>
          </div>
          <button
            type="button"
            ref={menuButton}
            className="mobile-menu"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-controls="menu-principal"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
        <nav
          id="menu-principal"
          className={menuOpen ? "main-nav open" : "main-nav"}
          aria-label="Navegação principal"
        >
          <div>
            <AppLink href="/" current={path === "/"} onNavigate={closeMenu}>
              Início
            </AppLink>
            <AppLink
              href="/produtos"
              current={path === "/produtos" && !activeCategory}
              onNavigate={closeMenu}
            >
              Catálogo
            </AppLink>
            <AppLink href="/#como-funciona" onNavigate={closeMenu}>
              Como funciona
            </AppLink>
            {isAdmin && (
              <a className="admin-link" href="/admin/" target="_blank" rel="noopener">
                Painel admin
              </a>
            )}
          </div>
        </nav>
      </header>
      {departments.length > 0 && (
        <nav className="dept-chips" aria-label="Departamentos">
          <div>
            {path === "/produtos" && (
              <AppLink href={chipHref("")} current={!activeCategory} className="dept-chip">
                Todos
              </AppLink>
            )}
            {departments.map((department) => (
              <AppLink
                key={department.id}
                href={chipHref(department.id)}
                current={activeCategory === department.id}
                className="dept-chip"
              >
                {department.name}
              </AppLink>
            ))}
          </div>
        </nav>
      )}
      <main id="conteudo" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <AppLink href="/" className="footer-name">
              {store.name}
            </AppLink>
            <p>{store.description}</p>
          </div>
          {hasLegal && (
            <address className="footer-legal">
              {store.legalName && <span>{store.legalName}</span>}
              {store.cnpj && <span>CNPJ {store.cnpj}</span>}
              {store.address && <span>{store.address}</span>}
            </address>
          )}
          <nav className="footer-col" aria-label="Rodapé">
            <h2>Navegue</h2>
            <AppLink href="/" current={path === "/"}>
              Início
            </AppLink>
            <AppLink href="/produtos" current={path === "/produtos"}>
              Produtos
            </AppLink>
            <AppLink href="/carrinho" current={path === "/carrinho"}>
              Carrinho
            </AppLink>
          </nav>
          <div className="footer-col">
            <h2>Atendimento</h2>
            <p>Segunda a sexta, 9h às 18h</p>
            <a href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a>
            {user && (
              <button type="button" onClick={() => onLogout("/")}>
                Sair da conta
              </button>
            )}
          </div>
        </div>
        <small className="footer-copy">
          © {new Date().getFullYear()} {store.name}
        </small>
      </footer>
    </div>
  );
}
