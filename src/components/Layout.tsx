import { ReactNode } from "react";
import { User } from "../types/domain";

export function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

type LayoutProps = {
  children: ReactNode;
  user: User | null;
  cartCount: number;
  onLogout(): void;
};

export function Layout({ children, user, cartCount, onLogout }: LayoutProps) {
  const isAdmin = user?.role.name === "admin";

  return (
    <div className="page-shell">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="topbar">Entrega calculada para seu endereço antes do pagamento.</div>
        <div className="header">
          <button className="brand brand-button" onClick={() => navigate("/")}>
            <span>EA</span>
            <strong>
              Ecommerce
              <br />
              Atacadão
            </strong>
          </button>
          <nav className="header-nav" aria-label="Navegação principal">
            <button onClick={() => navigate("/")}>Produtos</button>
            <button onClick={() => navigate("/carrinho")}>Carrinho</button>
            {isAdmin && <button onClick={() => navigate("/admin")}>Administração</button>}
          </nav>
          <div className="header-actions">
            {user ? (
              <>
                <button className="account-button" onClick={() => navigate("/conta")}>
                  Minha conta
                </button>
                <button className="account-button" onClick={onLogout}>
                  Sair
                </button>
              </>
            ) : (
              <button className="account-button" onClick={() => navigate("/entrar")}>
                Entrar
              </button>
            )}
            <button className="cart-button" onClick={() => navigate("/carrinho")}>
              <span aria-hidden="true">🛒</span>
              <span>Carrinho</span>
              <b>{cartCount}</b>
            </button>
          </div>
        </div>
      </header>
      <main id="conteudo">{children}</main>
      <footer>
        <button className="brand brand-button" onClick={() => navigate("/")}>
          <span>EA</span>
          <strong>Ecommerce Atacadão</strong>
        </button>
        <p>Compra simples, pagamento seguro.</p>
        <button onClick={() => navigate("/")}>Produtos</button>
        <button onClick={() => navigate("/carrinho")}>Carrinho</button>
      </footer>
    </div>
  );
}
