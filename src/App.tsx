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

function messageFor(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    return "Sua sessão expirou. Entre novamente para continuar.";
  }

  if (error instanceof ApiError && error.status === 409) {
    return "Seu carrinho mudou. Revise a compra antes de continuar.";
  }

  return error instanceof ApiError
    ? error.message
    : "Não foi possível conectar à loja agora. Tente novamente.";
}

function NotFoundPage() {
  return (
    <section className="state-page" aria-labelledby="not-found-title">
      <p className="eyebrow">PÁGINA NÃO ENCONTRADA</p>
      <h1 id="not-found-title">Este caminho não está disponível.</h1>
      <p>Volte à loja para encontrar produtos e continuar sua compra.</p>
      <button className="primary" onClick={() => navigate("/")}>
        Ir para a loja
      </button>
    </section>
  );
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) ?? "");
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [notice, setNotice] = useState("");

  const logout = useCallback((destination = "/") => {
    localStorage.removeItem(tokenKey);
    setToken("");
    setUser(null);
    setCart(null);
    setAddresses([]);
    navigate(destination);
  }, []);

  const handleError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        logout("/entrar");
      }

      setNotice(messageFor(error));
    },
    [logout],
  );

  const login = useCallback(async (email: string, password: string) => {
    const session = await api.login(email, password);
    localStorage.setItem(tokenKey, session.access_token);
    setToken(session.access_token);
    navigate("/conta");
  }, []);

  useEffect(() => {
    const updatePath = () => setPath(window.location.pathname);
    window.addEventListener("popstate", updatePath);
    return () => window.removeEventListener("popstate", updatePath);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([api.me(token), api.cart(token), api.addresses(token)])
      .then(([currentUser, savedCart, savedAddresses]) => {
        setUser(currentUser);
        setCart(savedCart);
        setAddresses(savedAddresses);
      })
      .catch(handleError);
  }, [handleError, token]);

  const goToLogin = useCallback(() => navigate("/entrar"), []);

  let page;
  switch (path) {
    case "/":
      page = (
        <CatalogPage
          token={token}
          onLogin={goToLogin}
          onCart={setCart}
          onError={handleError}
        />
      );
      break;
    case "/carrinho":
      page = (
        <CartPage
          token={token}
          cart={cart}
          addresses={addresses}
          onCart={setCart}
          onLogin={goToLogin}
          onError={handleError}
        />
      );
      break;
    case "/pagamento/retorno":
      page = <PaymentReturn token={token} onError={handleError} />;
      break;
    case "/conta":
      page = <AccountPage token={token} user={user} onError={handleError} />;
      break;
    case "/admin":
      page = <AdminPage token={token} user={user} onError={handleError} />;
      break;
    case "/entrar":
      page = (
        <LoginPage
          notice={
            new URLSearchParams(window.location.search).get("cadastro") === "concluido"
              ? "Cadastro concluído. Entre para continuar."
              : ""
          }
          onLogin={login}
        />
      );
      break;
    case "/cadastro":
      page = <RegisterPage />;
      break;
    default:
      page = <NotFoundPage />;
  }

  return (
    <Layout user={user} cartCount={cart?.total_items ?? 0} onLogout={logout}>
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button aria-label="Fechar aviso" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      {page}
    </Layout>
  );
}
