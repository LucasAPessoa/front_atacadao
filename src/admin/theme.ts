import { store } from "../shared/store-config";
import { brandTokens } from "../shared/theme";

export const THEME = "default";

/** Define o tema e grava o acento da marca (VITE_STORE_*) nos tokens do portal. */
export function applyTheme(root: HTMLElement = document.documentElement) {
  const tokens = brandTokens(store.theme.brand);
  root.dataset.theme = THEME;
  root.style.setProperty("--adm-accent", tokens.brand);
  root.style.setProperty("--adm-on-accent", tokens.onBrand);
  root.style.setProperty("--adm-accent-text", tokens.brandText);
}
