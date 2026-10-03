import { useCallback, useEffect, useState } from "react";
import { Layout, navigate } from "./components/Layout";
import { AccountPage } from "./features/account/AccountPage";
import { AdminPage } from "./features/admin/AdminPage";
import { LoginPage, RegisterPage } from "./features/auth/AuthPages";
import { CartPage } from "./features/cart/CartPage";
import { CatalogPage } from "./features/catalog/CatalogPage";
import { PaymentReturn } from "./features/payment/PaymentReturn";
import { ApiError, api } from "./services/client";
import { Address, Cart, User } from "./types/domain";

const tokenKey = "ecommerce-atacadao.access-token";
const refreshTokenKey = "ecommerce-atacadao.refresh-token";
const messageFor = (error: unknown) => error instanceof ApiError && error.status === 401 ? "Sua sessão expirou. Entre novamente para continuar." : error instanceof ApiError && error.status === 409 ? "O carrinho foi alterado. Revise os valores antes de continuar." : error instanceof ApiError ? error.message : "Não foi possível conectar à loja agora. Tente novamente.";

function NotFoundPage() { return <section className="state-page"><p className="eyebrow">404 · CAMINHO NÃO ENCONTRADO</p><h1>Essa página saiu da rota.</h1><p>Volte à vitrine para continuar sua compra.</p><button className="primary" onClick={() => navigate("/")}>Ir para a loja</button></section>; }

export default function App() {
  const [location, setLocation] = useState(() => window.location.pathname + window.location.search);
  const path = new URL(location, window.location.origin).pathname;
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) ?? "");
  const [user, setUser] = useState<User | null>(null); const [cart, setCart] = useState<Cart | null>(null); const [addresses, setAddresses] = useState<Address[]>([]); const [notice, setNotice] = useState("");
  const logout = useCallback((destination = "/") => {
    const refreshToken = localStorage.getItem(refreshTokenKey);
    localStorage.removeItem(tokenKey); localStorage.removeItem(refreshTokenKey); setToken(""); setUser(null); setCart(null); setAddresses([]); navigate(destination);
    if (token && refreshToken) void api.logout(token, refreshToken).catch(() => { /* A sessão local já foi encerrada com segurança. */ });
  }, [token]);
  const handleError = useCallback((error: unknown) => { if (error instanceof ApiError && error.status === 401) logout("/entrar"); setNotice(messageFor(error)); }, [logout]);
  const login = useCallback(async (email: string, password: string) => { const session = await api.login(email, password); localStorage.setItem(tokenKey, session.access_token); localStorage.setItem(refreshTokenKey, session.refresh_token); setToken(session.access_token); navigate("/conta"); }, []);
  useEffect(() => { const update = () => setLocation(window.location.pathname + window.location.search); window.addEventListener("popstate", update); return () => window.removeEventListener("popstate", update); }, []);
  useEffect(() => { if (!token) return; Promise.all([api.me(token), api.cart(token), api.addresses(token)]).then(([currentUser, savedCart, savedAddresses]) => { setUser(currentUser); setCart(savedCart); setAddresses(savedAddresses); }).catch(handleError); }, [handleError, token]);
  const catalog = <CatalogPage token={token} onLogin={() => navigate("/entrar")} onCart={setCart} onError={handleError} mode={path === "/" ? "home" : "catalog"} query={window.location.search} />;
  const pages: Record<string, React.ReactNode> = { "/": catalog, "/produtos": catalog, "/carrinho": <CartPage token={token} cart={cart} addresses={addresses} onCart={setCart} onLogin={() => navigate("/entrar")} onError={handleError} />, "/pagamento/retorno": <PaymentReturn token={token} onError={handleError} />, "/conta": <AccountPage token={token} user={user} onError={handleError} onLogout={() => logout("/")} />, "/admin": <AdminPage token={token} user={user} onError={handleError} />, "/entrar": <LoginPage notice={new URLSearchParams(window.location.search).get("cadastro") === "concluido" ? "Cadastro concluído. Entre para continuar." : ""} onLogin={login} />, "/cadastro": <RegisterPage /> };
  return <Layout user={user} cartCount={cart?.total_items ?? 0} onLogout={logout} path={path}>{notice && <div className="notice" role="status">{notice}<button aria-label="Fechar aviso" onClick={() => setNotice("")}>×</button></div>}{pages[path] ?? <NotFoundPage />}</Layout>;
}
