import { type ReactNode, createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/client";
import { store } from "../shared/store-config";

export type StoreThemeState = { theme: string; brand: string };

const fallback: StoreThemeState = { theme: "gondola", brand: store.theme.brand };
const StoreThemeContext = createContext<StoreThemeState>(fallback);

export const useStoreTheme = () => useContext(StoreThemeContext);

/**
 * Busca GET /store/theme ao iniciar. Enquanto não chega (ou se falhar, ou brand_color for null)
 * vale VITE_STORE_BRAND_COLOR; ao chegar, a cor do servidor entra sem remontar a árvore.
 */
export function StoreThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreThemeState>(fallback);
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
