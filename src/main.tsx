import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";
import { StoreThemeProvider } from "./components/StoreTheme";
import { store } from "./shared/store-config";

document.title = store.name;

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <StoreThemeProvider>
      <App />
    </StoreThemeProvider>
  </StrictMode>,
);
