import { ReactNode, useState } from "react";
import { store } from "../config/store";
import { User } from "../types/domain";

export function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

type LayoutProps = { children: ReactNode; user: User | null; cartCount: number; onLogout(destination?: string): void; path: string };

export function Layout({ children, user, cartCount, onLogout, path }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const isAdmin = user?.role.name === "admin";
  const go = (target: string) => { setMenuOpen(false); navigate(target); };
  const submitSearch = () => {
    const params = new URLSearchParams();
    if (headerSearch.trim()) params.set("busca", headerSearch.trim());
    go(`/produtos${params.size ? `?${params}` : ""}`);
  };
  const authRoute = path === "/entrar" || path === "/cadastro";
  const themeStyle = {
    "--accent": store.theme.accent,
    "--accent-strong": store.theme.accentStrong,
    "--ink": store.theme.ink,
    "--parchment": store.theme.parchment,
    "--surface": store.theme.surface,
    "--field": store.theme.field,
    "--muted": store.theme.muted,
    "--border": store.theme.border,
    "--leaf": store.theme.leaf,
  } as React.CSSProperties;

  if (authRoute) return <main id="conteudo" className="auth-layout" style={themeStyle}>{children}</main>;

  return <div className="page-shell" style={themeStyle}>
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <div className="announcement"><span>Compra em quantidade, sem surpresa</span><b>{store.announcement}</b><span>Atendimento em horário comercial</span></div>
    <header className="site-header">
      <div className="header-inner">
        <button className="brand brand-button" onClick={() => go("/")} aria-label={`Ir para ${store.name}`}>
          <span className="brand-mark">{store.shortName}</span><span><strong>{store.name}</strong><small>para toda a rotina</small></span>
        </button>
        <button className="header-departments" onClick={() => go("/produtos")}><span aria-hidden="true">☰</span> Departamentos</button>
        <label className="header-search"><span aria-hidden="true">⌕</span><input aria-label="Buscar no catálogo" value={headerSearch} onChange={(event) => setHeaderSearch(event.target.value)} placeholder="O que a sua rotina precisa?" onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); }} /><button onClick={submitSearch} aria-label="Buscar">Buscar</button></label>
        <div className="header-actions">
          <button className="support-action" onClick={() => window.location.href = `mailto:${store.supportEmail}`}><span>◌</span><b>Precisa de ajuda?</b><small>Fale com a gente</small></button>
          {user ? <button className="icon-action" onClick={() => go("/conta")} aria-label="Minha conta"><span aria-hidden="true">◉</span><b>Olá!</b><small>Minha conta</small></button> : <button className="icon-action" onClick={() => go("/entrar")} aria-label="Entrar"><span aria-hidden="true">◉</span><b>Entre ou cadastre-se</b><small>Minha conta</small></button>}
          <button className="cart-button" onClick={() => go("/carrinho")}><span aria-hidden="true">⌑</span><b>Carrinho</b><em>{cartCount}</em></button>
          <button className="mobile-menu" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}>☰</button>
        </div>
      </div>
      <nav className={menuOpen ? "main-nav open" : "main-nav"} aria-label="Navegação principal">
        <div><button className={path === "/" ? "active" : ""} onClick={() => go("/")}>Início</button><button className={path === "/produtos" ? "active" : ""} onClick={() => go("/produtos")}>Catálogo</button><button onClick={() => document.getElementById("como-funciona")?.scrollIntoView()}>Como funciona</button>{isAdmin && <button className={path === "/admin" ? "active" : ""} onClick={() => go("/admin")}>Administração</button>}</div>
      </nav>
    </header>
    <main id="conteudo">{children}</main>
    <footer className="site-footer">
      <div><button className="brand brand-button" onClick={() => go("/")}><span className="brand-mark">{store.shortName}</span><strong>{store.name}</strong></button><p>{store.description}</p></div>
      <div><h2>Navegue</h2><button onClick={() => go("/")}>Início</button><button onClick={() => go("/produtos")}>Produtos</button><button onClick={() => go("/carrinho")}>Carrinho</button></div>
      <div><h2>Atendimento</h2><p>Segunda a sexta, 9h às 18h</p><a href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a>{user && <button className="footer-logout" onClick={() => onLogout("/")}>Sair da conta</button>}</div>
      <small>© {new Date().getFullYear()} {store.name}. Vitrine de portfólio customizável.</small>
    </footer>
  </div>;
}
