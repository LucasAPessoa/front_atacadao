import { type RouteObject, createBrowserRouter } from "react-router";
import { RequireAdmin } from "./auth/RequireAdmin";
import { comingSoonSections } from "./features/coming-soon/sections";
import { AdminLayout } from "./layout/AdminLayout";

const dashboard = {
  lazy: () => import("./features/dashboard/Dashboard").then((m) => ({ Component: m.Dashboard })),
};
const moderation = {
  lazy: () =>
    import("./features/moderation/ModerationPage").then((m) => ({ Component: m.ModerationPage })),
};
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

const comingSoonRoutes: RouteObject[] = comingSoonSections.map((section) => ({
  path: section.path,
  lazy: () =>
    import("./features/coming-soon/ComingSoon").then((m) => ({
      Component: () => <m.ComingSoon title={section.label} />,
    })),
}));

export const routes: RouteObject[] = [
  { path: "/login", lazy: () => import("./auth/LoginPage") },
  {
    element: <RequireAdmin />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, ...dashboard },
          { path: "produtos", ...products },
          { path: "produtos/:id", ...productDetail },
          { path: "pedidos", ...orders },
          { path: "pedidos/:id", ...orderDetail },
          { path: "moderacao", ...moderation },
          { path: "bling", ...bling },
          // Retorno do OAuth do Bling (a API redireciona para /admin/integracoes/bling?resultado=...).
          { path: "integracoes/bling", ...bling },
          ...comingSoonRoutes,
        ],
      },
    ],
  },
  { path: "*", element: <p className="adm-content">Página não encontrada.</p> },
];

export const createRouter = () =>
  createBrowserRouter(routes, {
    basename: "/admin",
    future: { v8_middleware: true },
  });
