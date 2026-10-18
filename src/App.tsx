import { useCallback, useEffect, useState } from "react";
import { Layout, navigate } from "./components/Layout";
import { AccountPage } from "./features/account/AccountPage";
import { AdminPage } from "./features/admin/AdminPage";
import { LoginPage, RegisterPage } from "./features/auth/AuthPages";
import { CartPage } from "./features/cart/CartPage";
import { CatalogPage } from "./features/catalog/CatalogPage";
import { PaymentReturn } from "./features/payment/PaymentReturn";
import {
  ApiError,
  api,
  clearSession,
  getAccessToken,
  getRefreshToken,
  hasStoredSession,
  refreshSession,
  setOnSessionExpired,
  storeSession,
} from "./services/client";
import type { Address, Cart, User } from "./types/domain";

const messageFor = (error: unknown) =>
  error instanceof ApiError && error.status === 401
    ? "Sua sessão expirou. Entre novamente para continuar."
    : error instanceof ApiError && error.status === 409
      ? "O carrinho foi alterado. Revise os valores antes de continuar."
      : error instanceof ApiError
        ? error.message
        : "Não foi possível conectar à loja agora. Tente novamente.";

function NotFoundPage() {
  return (
    <section className="state-page">
      <p className="eyebrow">404 · CAMINHO NÃO ENCONTRADO</p>
      <h1>Essa página saiu da rota.</h1>
      <p>Volte à vitrine para continuar sua compra.</p>
      <button type="button" className="primary" onClick={() => navigate("/")}>
        Ir para a loja
      </button>
    </section>
  );
}

export default function App() {
  const [location, setLocation] = useState(() => window.location.pathname + window.location.search);
  const path = new URL(location, window.location.origin).pathname;
  const [token, setToken] = useState(() => getAccessToken());
  const [restoring, setRestoring] = useState(() => hasStoredSession() && !getAccessToken());
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [notice, setNotice] = useState("");
  const logout = useCallback(
    (destination = "/") => {
      const refreshToken = getRefreshToken();
      const current = getAccessToken() || token;
      clearSession();
      setToken("");
      setUser(null);
      setCart(null);
      setAddresses([]);
      navigate(destination);
      if (current && refreshToken)
        void api.logout(current, refreshToken).catch(() => {
          /* A sessão local já foi encerrada com segurança. */
        });
    },
    [token],
  );
  const handleError = useCallback((error: unknown) => {
    setNotice(messageFor(error));
  }, []);
  const login = useCallback(async (email: string, password: string) => {
    const session = await api.login(email, password);
    storeSession(session);
    setToken(session.access_token);
    const requested = new URLSearchParams(window.location.search).get("returnTo");
    const returnTo =
      requested?.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/\\")
        ? requested
        : "/conta";
    navigate(returnTo);
  }, []);
  useEffect(() => {
    setOnSessionExpired(() => {
      setToken("");
      setUser(null);
      setCart(null);
      setAddresses([]);
      const here = window.location.pathname + window.location.search;
      navigate(
        window.location.pathname === "/entrar"
          ? here
          : `/entrar?returnTo=${encodeURIComponent(here)}`,
      );
    });
  }, []);
  useEffect(() => {
    if (!restoring) return;
    refreshSession(false)
      .then(setToken)
      .catch(() => undefined)
      .finally(() => setRestoring(false));
  }, [restoring]);
  useEffect(() => {
    const update = () => setLocation(window.location.pathname + window.location.search);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  useEffect(() => {
    if (!token) return;
    Promise.all([api.me(token), api.cart(token), api.addresses(token)])
      .then(([currentUser, savedCart, savedAddresses]) => {
        setUser(currentUser);
        setCart(savedCart);
        setAddresses(savedAddresses);
      })
      .catch(handleError);
  }, [handleError, token]);
  const refreshAddresses = useCallback(async () => {
    setAddresses(await api.addresses(token));
  }, [token]);
  const catalog = (
    <CatalogPage
      token={token}
      onLogin={() => navigate("/entrar")}
      onCart={setCart}
      onError={handleError}
      mode={path === "/" ? "home" : "catalog"}
      query={window.location.search}
    />
  );
  const pages: Record<string, React.ReactNode> = {
    "/": catalog,
    "/produtos": catalog,
    "/carrinho": (
      <CartPage
        token={token}
        cart={cart}
        addresses={addresses}
        onAddresses={refreshAddresses}
        onCart={setCart}
        onLogin={() => navigate("/entrar")}
        onError={handleError}
      />
    ),
    "/pagamento/retorno": <PaymentReturn token={token} onError={handleError} />,
    "/conta": (
      <AccountPage
        token={token}
        user={user}
        addresses={addresses}
        onAddresses={refreshAddresses}
        onError={handleError}
        onLogout={() => logout("/")}
      />
    ),
    "/admin": <AdminPage token={token} user={user} onError={handleError} />,
    "/entrar": (
      <LoginPage
        notice={
          new URLSearchParams(window.location.search).get("cadastro") === "concluido"
            ? "Cadastro concluído. Entre para continuar."
            : ""
        }
        onLogin={login}
      />
    ),
    "/cadastro": <RegisterPage />,
  };
  return (
    <Layout user={user} cartCount={cart?.total_items ?? 0} onLogout={logout} path={path}>
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button type="button" aria-label="Fechar aviso" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {restoring ? (
        <section className="state-page" role="status">
          <p>Restaurando sua sessão…</p>
        </section>
      ) : (
        (pages[path] ?? <NotFoundPage />)
      )}
    </Layout>
  );
}
