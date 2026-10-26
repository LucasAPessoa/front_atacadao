import { type RouteObject, createBrowserRouter } from "react-router";
import { RequireAdmin } from "./auth/RequireAdmin";
import { AdminLayout } from "./layout/AdminLayout";

const soon = (name: string) => ({
  lazy: () => import("./pages/ComingSoon").then((m) => ({ Component: m[name as "Dashboard"] })),
});
const products = {
  lazy: () =>
    import("./features/products/ProductsList").then((m) => ({ Component: m.ProductsList })),
};
const productDetail = {
  lazy: () =>
    import("./features/products/ProductDetail").then((m) => ({ Component: m.ProductDetail })),
};
const orders = {
  lazy: () => import("./features/orders/OrdersList").then((m) => ({ Component: m.OrdersList })),
};
const orderDetail = {
  lazy: () => import("./features/orders/OrderDetail").then((m) => ({ Component: m.OrderDetail })),
};
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
          { path: "produtos", ...products },
          { path: "produtos/:id", ...productDetail },
          { path: "pedidos", ...orders },
          { path: "pedidos/:id", ...orderDetail },
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
