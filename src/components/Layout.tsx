import { type ReactNode, useState } from "react";
import { store } from "../shared/store-config";
import { brandTokens } from "../shared/theme";
import type { User } from "../shared/types/domain";

const tokens = brandTokens(store.theme.brand);
const themeStyle = {
  "--brand": tokens.brand,
  "--on-brand": tokens.onBrand,
  "--brand-text": tokens.brandText,
} as React.CSSProperties;

export function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  // Nova página abre no topo; voltar/avançar do histórico deixa o navegador restaurar a rolagem.
  window.scrollTo?.(0, 0);
}

type LayoutProps = {
  children: ReactNode;
  user: User | null;
  cartCount: number;
  onLogout(destination?: string): void;
  path: string;
  reconnectBling?: boolean;
};

export function Layout({ children, user, cartCount, onLogout, path, reconnectBling }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (new URLSearchParams(window.location.search).get("busca") ?? ""),
  );
  const isAdmin = user?.role.name === "admin";
  const go = (target: string) => {
    setMenuOpen(false);
    navigate(target);
  };
  const submitSearch = () => {
    const params = new URLSearchParams();
    if (headerSearch.trim()) params.set("busca", headerSearch.trim());
    go(`/produtos${params.size ? `?${params}` : ""}`);
  };
  const authRoute = path === "/entrar" || path === "/cadastro";
  const count = String(cartCount).padStart(2, "0");
  const hasLegal = Boolean(store.legalName || store.cnpj || store.address);

  if (authRoute)
    return (
      <main id="conteudo" className="auth-layout" style={themeStyle}>
        {children}
      </main>
    );

  return (
    <div className="page-shell" style={themeStyle}>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <div className="announcement">{store.announcement}</div>
      <header className="site-header">
        <div className="header-inner">
          <button
            type="button"
            className="brand brand-button"
            onClick={() => go("/")}
            aria-label={`Ir para ${store.name}`}
          >
            <span className="brand-mark" aria-hidden="true" />
            <span>{store.name}</span>
          </button>
          <button
            type="button"
            className="mobile-menu"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-controls="menu-principal"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {menuOpen ? "×" : "☰"}
          </button>
          <div className="header-search">
            <label htmlFor="busca-header">Busca</label>
            <input
              id="busca-header"
              type="search"
              value={headerSearch}
              onChange={(event) => setHeaderSearch(event.target.value)}
              placeholder="O que a sua rotina precisa?"
              onKeyDown={(event) => {
                if (event.key === "Enter") submitSearch();
              }}
            />
            <button type="button" onClick={submitSearch} aria-label="Buscar">
              Buscar
            </button>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="header-cell support-action"
              onClick={() => (window.location.href = `mailto:${store.supportEmail}`)}
            >
              Ajuda
            </button>
            {user ? (
              <button
                type="button"
                className="header-cell"
                onClick={() => go("/conta")}
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
              </button>
            ) : (
              <button
                type="button"
                className="header-cell"
                onClick={() => go("/entrar")}
                aria-label="Entrar"
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
                <span className="hc-label">Entrar</span>
              </button>
            )}
            <button
              type="button"
              className="cart-button"
              onClick={() => go("/carrinho")}
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
              <span className="cart-count" aria-hidden="true">
                [{count}]
              </span>
            </button>
          </div>
        </div>
        <nav
          id="menu-principal"
          className={menuOpen ? "main-nav open" : "main-nav"}
          aria-label="Navegação principal"
        >
          <div>
            <button type="button" className={path === "/" ? "active" : ""} onClick={() => go("/")}>
              Início
            </button>
            <button
              type="button"
              className={path === "/produtos" ? "active" : ""}
              onClick={() => go("/produtos")}
            >
              Catálogo
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                document.getElementById("como-funciona")?.scrollIntoView();
              }}
            >
              Como funciona
            </button>
            {isAdmin && (
              <button
                type="button"
                className={path === "/admin" ? "active" : ""}
                onClick={() => go("/admin")}
              >
                Administração
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                className={path === "/admin/integracoes/bling" ? "active" : ""}
                onClick={() => go("/admin/integracoes/bling")}
              >
                Integração Bling
              </button>
            )}
          </div>
        </nav>
      </header>
      {isAdmin && reconnectBling && (
        <div className="notice" role="alert">
          A conexão com o Bling precisa ser refeita.{" "}
          <button type="button" onClick={() => go("/admin/integracoes/bling")}>
            Reconectar
          </button>
        </div>
      )}
      <main id="conteudo">{children}</main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <button type="button" className="footer-name" onClick={() => go("/")}>
              {store.name}
            </button>
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
            <button type="button" onClick={() => go("/")}>
              Início
            </button>
            <button type="button" onClick={() => go("/produtos")}>
              Produtos
            </button>
            <button type="button" onClick={() => go("/carrinho")}>
              Carrinho
            </button>
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
