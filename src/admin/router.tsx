import { type RouteObject, createBrowserRouter } from "react-router";
import { RequireAdmin } from "./auth/RequireAdmin";
import { AdminLayout } from "./layout/AdminLayout";

const soon = (name: string) => ({
  lazy: () => import("./pages/ComingSoon").then((m) => ({ Component: m[name as "Dashboard"] })),
});
const bling = {
  lazy: () => import("./features/bling/BlingPage").then((m) => ({ Component: m.BlingPage })),
};

export const routes: RouteObject[] = [
  { path: "/login", lazy: () => import("./auth/LoginPage") },
  {
    element: <RequireAdmin />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, ...soon("Dashboard") },
          { path: "produtos", ...soon("Products") },
          { path: "produtos/:id", ...soon("ProductDetail") },
          { path: "pedidos", ...soon("Orders") },
          { path: "pedidos/:id", ...soon("OrderDetail") },
          { path: "moderacao", ...soon("Moderation") },
          { path: "bling", ...bling },
          // Retorno do OAuth do Bling (a API redireciona para /admin/integracoes/bling?resultado=...).
          { path: "integracoes/bling", ...bling },
        ],
      },
    ],
  },
  { path: "*", element: <p className="adm-content">Página não encontrada.</p> },
];

export const createRouter = () => createBrowserRouter(routes, { basename: "/admin" });
