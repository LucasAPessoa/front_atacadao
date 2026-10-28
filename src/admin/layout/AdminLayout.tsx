import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { store } from "../../shared/store-config";
import { useAuth } from "../auth/AuthProvider";
import { comingSoonSections } from "../features/coming-soon/sections";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/produtos", label: "Produtos" },
  { to: "/pedidos", label: "Pedidos" },
  { to: "/moderacao", label: "Moderação" },
  { to: "/bling", label: "Bling" },
  { to: "/configuracoes", label: "Configurações" },
];

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="adm-shell">
      <a className="adm-skip-link" href="#adm-conteudo">
        Pular para o conteúdo
      </a>
      <aside className="adm-sidebar" data-open={menuOpen}>
        <span className="adm-brand">{store.name}</span>
        <nav className="adm-nav" id="adm-menu" aria-label="Painel">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setMenuOpen(false)}>
              {link.label}
            </NavLink>
          ))}
          <span className="adm-nav-group-label" id="adm-nav-soon">
            Em breve:
          </span>
          <ul className="adm-nav-group" aria-labelledby="adm-nav-soon">
            {comingSoonSections.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} onClick={() => setMenuOpen(false)}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="adm-main-col">
        <header className="adm-topbar">
          <button
            type="button"
            className="adm-btn adm-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="adm-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Fechar menu" : "Menu"}
          </button>
          <span className="adm-topbar-title">{store.name}</span>
          <span className="adm-topbar-user">{user?.full_name || user?.email}</span>
          <button type="button" className="adm-btn" onClick={() => void logout()}>
            Sair
          </button>
        </header>
        <main id="adm-conteudo" className="adm-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
