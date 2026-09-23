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
  const isAdmin = user?.role.name === "admin";
  const go = (target: string) => { setMenuOpen(false); navigate(target); };
  const authRoute = path === "/entrar" || path === "/cadastro";

  if (authRoute) return <main id="conteudo" className="auth-layout">{children}</main>;

  return <div className="page-shell" style={{ "--accent": store.theme.accent, "--ink": store.theme.ink, "--leaf": store.theme.leaf } as React.CSSProperties}>
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <div className="announcement"><span>✦</span>{store.announcement}<span>Compra protegida pelo Checkout Pro</span></div>
    <header className="site-header">
      <div className="header-inner">
        <button className="brand brand-button" onClick={() => go("/")} aria-label={`Ir para ${store.name}`}>
          <span className="brand-mark">{store.shortName}</span><span><strong>{store.name}</strong><small>para toda a rotina</small></span>
        </button>
        <nav className={menuOpen ? "main-nav open" : "main-nav"} aria-label="Navegação principal">
          <button className={path === "/" ? "active" : ""} onClick={() => go("/")}>Início</button>
          <button className={path === "/produtos" ? "active" : ""} onClick={() => go("/produtos")}>Produtos</button>
          <button className={path === "/carrinho" ? "active" : ""} onClick={() => go("/carrinho")}>Carrinho</button>
          {isAdmin && <button className={path === "/admin" ? "active" : ""} onClick={() => go("/admin")}>Administração</button>}
        </nav>
        <div className="header-actions">
          {user ? <button className="icon-action" onClick={() => go("/conta")} aria-label="Minha conta"><span aria-hidden="true">◉</span><b>Conta</b></button> : <button className="icon-action" onClick={() => go("/entrar")} aria-label="Entrar"><span aria-hidden="true">◉</span><b>Entrar</b></button>}
          <button className="cart-button" onClick={() => go("/carrinho")}><span aria-hidden="true">⌑</span><b>Carrinho</b><em>{cartCount}</em></button>
          <button className="mobile-menu" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}>☰</button>
        </div>
      </div>
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
