import type { ReactNode } from "react";
import { handleLinkClick } from "../lib/product";
import { navigate } from "../lib/navigation";

/**
 * Link de navegação da loja: `<a href>` real (abre em nova aba, mostra o destino) e,
 * no clique simples, navega sem recarregar. `current` marca a página ativa.
 * Com âncora ("/#como-funciona"), rola até a seção depois de trocar de página.
 */
export function AppLink({
  href,
  current = false,
  className,
  onNavigate,
  children,
  ...rest
}: {
  href: string;
  current?: boolean;
  className?: string;
  onNavigate?(): void;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <a
      href={href}
      className={className}
      aria-current={current ? "page" : undefined}
      onClick={(event) =>
        handleLinkClick(event, href, (target) => {
          onNavigate?.();
          goTo(target);
        })
      }
      {...rest}
    >
      {children}
    </a>
  );
}

/** Navega e, se houver `#id`, rola até a seção (que só existe depois de renderizar). */
export function goTo(target: string) {
  const [path, hash] = target.split("#");
  const here = window.location.pathname + window.location.search;
  if (path && path !== here) navigate(path);
  if (!hash) return;
  // A seção só existe depois do render: tenta por alguns quadros.
  const scroll = (tries = 10) => {
    const section = document.getElementById(hash);
    if (section) {
      section.scrollIntoView();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${window.location.search}#${hash}`,
      );
    } else if (tries > 0) requestAnimationFrame(() => scroll(tries - 1));
  };
  scroll();
}
