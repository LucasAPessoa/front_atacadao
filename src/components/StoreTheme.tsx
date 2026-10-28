import { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/client";
import { store } from "../shared/store-config";

export type StoreThemeState = { theme: string; brand: string };

const fallback: StoreThemeState = { theme: "gondola", brand: store.theme.brand };
export const THEME_CACHE_KEY = "store-theme";

function readCache(): StoreThemeState {
  try {
    const raw = JSON.parse(localStorage.getItem(THEME_CACHE_KEY) ?? "null");
    if (raw && typeof raw.theme === "string" && /^#[0-9a-fA-F]{6}$/.test(raw.brand))
      return { theme: raw.theme, brand: raw.brand };
  } catch {
    // cache ausente ou corrompido: vale o padrão do build
  }
  return fallback;
}

function writeCache(state: StoreThemeState) {
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(state));
  } catch {
    // armazenamento indisponível: segue sem cache
  }
}
const StoreThemeContext = createContext<StoreThemeState>(fallback);

export const useStoreTheme = () => useContext(StoreThemeContext);

/**
 * Busca GET /store/theme ao iniciar. Enquanto não chega (ou se falhar, ou brand_color for null)
 * vale VITE_STORE_BRAND_COLOR; ao chegar, a cor do servidor entra sem remontar a árvore.
 */
export function StoreThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreThemeState>(readCache);
  useEffect(() => {
    let active = true;
    api
      .storeTheme()
      .then((data) => {
        if (!active) return;
        setState({
          theme: data.theme || fallback.theme,
          brand: data.brand_color || fallback.brand,
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return <StoreThemeContext.Provider value={state}>{children}</StoreThemeContext.Provider>;
}
