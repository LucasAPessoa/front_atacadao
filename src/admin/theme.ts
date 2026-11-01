export const THEME = "default";

/**
 * Define o tema do portal. O admin segue o Sistema Gôndola com acento neutro: a cor da marca
 * da loja (VITE_STORE_*) não entra aqui, só na vitrine.
 */
export function applyTheme(root: HTMLElement = document.documentElement) {
  root.dataset.theme = THEME;
}
