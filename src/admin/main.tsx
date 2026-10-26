import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { store } from "../shared/store-config";
import { AuthProvider } from "./auth/AuthProvider";
import { queryClient } from "./queryClient";
import { createRouter } from "./router";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import { applyTheme } from "./theme";
import { ToastProvider } from "./ui/Toast";

applyTheme();
document.title = `Painel — ${store.name}`;

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={createRouter()} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
