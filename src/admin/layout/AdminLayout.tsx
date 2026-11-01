import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { store } from "../../shared/store-config";
import { useAuth } from "../auth/AuthProvider";
import { comingSoonSections } from "../features/coming-soon/sections";
import { NavIcon } from "./NavIcon";

const links = [
  { to: "/", label: "Painel", icon: "dashboard", end: true },
  { to: "/produtos", label: "Produtos", icon: "produtos" },
  { to: "/pedidos", label: "Pedidos", icon: "pedidos" },
  { to: "/moderacao", label: "Moderação", icon: "moderacao" },
  { to: "/bling", label: "Bling", icon: "bling" },
  { to: "/configuracoes", label: "Configurações", icon: "configuracoes", end: true },
  { to: "/configuracoes/precos", label: "Preços", icon: "precos" },
];

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const topbarRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  // A gaveta começa logo abaixo da topbar, que quebra de linha em telas estreitas.
  useLayoutEffect(() => {
    if (!menuOpen) return;
    const measure = () => {
      if (window.innerWidth > 768) {
        setMenuOpen(false);
        return;
      }
      if (topbarRef.current && shellRef.current) {
        shellRef.current.style.setProperty(
          "--adm-topbar-height",
          `${topbarRef.current.getBoundingClientRect().height}px`,
        );
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const toggle = toggleRef.current;
    const focusables = () => [
      ...(sidebarRef.current?.querySelectorAll<HTMLElement>("a[href], button") ?? []),
      ...(toggle ? [toggle] : []),
    ];
    focusables()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (!items.includes(active as HTMLElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      toggle?.focus();
    };
  }, [menuOpen]);

  const logout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="adm-shell" ref={shellRef}>
      <a className="adm-skip-link" href="#adm-conteudo">
        Pular para o conteúdo
      </a>
      <aside className="adm-sidebar" data-open={menuOpen} ref={sidebarRef}>
        <span className="adm-brand">
          <span className="adm-brand-name">{store.name}</span>
          <span className="adm-brand-sub">Painel da loja</span>
        </span>
        <nav className="adm-nav" id="adm-menu" aria-label="Painel">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setMenuOpen(false)}>
              <NavIcon name={link.icon} />
              <span>{link.label}</span>
            </NavLink>
          ))}
          <span className="adm-nav-group-label" id="adm-nav-soon">
            Em breve
          </span>
          <ul className="adm-nav-group" aria-labelledby="adm-nav-soon">
            {comingSoonSections.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} onClick={() => setMenuOpen(false)}>
                  <NavIcon name={link.path} size={18} />
                  <span>{link.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        {/* Usuário e Sair no rodapé da sidebar (a artboard não tem topbar no desktop). */}
        <div className="adm-sidebar-foot">
          <span className="adm-sidebar-user">{user?.full_name || user?.email}</span>
          <button
            type="button"
            className="adm-btn adm-sidebar-logout"
            onClick={() => void logout()}
          >
            Sair
          </button>
        </div>
      </aside>
      {menuOpen && (
        <button
          type="button"
          className="adm-nav-scrim"
          aria-label="Fechar menu"
          tabIndex={-1}
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="adm-main-col">
        <header className="adm-topbar" ref={topbarRef}>
          <button
            type="button"
            ref={toggleRef}
            className="adm-btn adm-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="adm-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Fechar menu" : "Menu"}
          </button>
          <span className="adm-topbar-title">{store.name}</span>
        </header>
        <main id="adm-conteudo" className="adm-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
