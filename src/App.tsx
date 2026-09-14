import { FormEvent, useCallback, useEffect, useState } from "react";
import { Layout, navigate } from "./components/Layout";
import { AccountPage } from "./features/account/AccountPage";
import { AdminPage } from "./features/admin/AdminPage";
import { CartPage } from "./features/cart/CartPage";
import { CatalogPage } from "./features/catalog/CatalogPage";
import { PaymentReturn } from "./features/payment/PaymentReturn";
import { api, ApiError } from "./services/client";
import { Address, Cart, User } from "./types/domain";

const tokenKey = "ecommerce-atacadao.access-token";
const messageFor = (error: unknown) => error instanceof ApiError && error.status === 401 ? "Sua sessão expirou. Entre novamente para continuar." : error instanceof ApiError && error.status === 409 ? "Seu carrinho mudou. Revise a compra antes de continuar." : error instanceof ApiError ? error.message : "Não foi possível conectar à loja agora. Tente novamente.";
export default function App() { const [path, setPath] = useState(window.location.pathname); const [token, setToken] = useState(() => localStorage.getItem(tokenKey) ?? ""); const [user, setUser] = useState<User | null>(null); const [cart, setCart] = useState<Cart | null>(null); const [addresses, setAddresses] = useState<Address[]>([]); const [notice, setNotice] = useState(""); const [loginOpen, setLoginOpen] = useState(false);
  useEffect(() => { const update = () => setPath(window.location.pathname); window.addEventListener("popstate", update); return () => window.removeEventListener("popstate", update); }, []);
  useEffect(() => { if (!token) return; Promise.all([api.me(token), api.cart(token), api.addresses(token)]).then(([me, savedCart, savedAddresses]) => { setUser(me); setCart(savedCart); setAddresses(savedAddresses); }).catch((error) => { if ((error as { status?: number }).status === 401) logout(); setNotice(messageFor(error)); }); }, [token]);
  const logout = useCallback(() => {
    localStorage.removeItem(tokenKey);
    setToken("");
    setUser(null);
    setCart(null);
    setAddresses([]);
    navigate("/");
  }, []);
  const handleError = useCallback((error: unknown) => {
    if ((error as { status?: number }).status === 401) {
      logout();
      setLoginOpen(true);
    }
    setNotice(messageFor(error));
  }, [logout]);
  async function login(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); try { const session = await api.login(String(data.get("email")), String(data.get("password"))); localStorage.setItem(tokenKey, session.access_token); setToken(session.access_token); setLoginOpen(false); } catch (error) { setNotice(error instanceof ApiError && error.status === 401 ? "Confira seu e-mail e senha." : messageFor(error)); } }
  const page = path === "/carrinho" ? <CartPage token={token} cart={cart} addresses={addresses} onCart={setCart} onLogin={() => setLoginOpen(true)} onError={handleError} /> : path === "/pagamento/retorno" ? <PaymentReturn token={token} onError={handleError} /> : path === "/conta" ? <AccountPage token={token} user={user} onError={handleError} /> : path === "/admin" ? <AdminPage token={token} user={user} onError={handleError} /> : <CatalogPage token={token} onLogin={() => setLoginOpen(true)} onCart={setCart} onError={handleError} />;
  return <><Layout user={user} cartCount={cart?.total_items ?? 0} onLogin={() => setLoginOpen(true)} onLogout={logout}>{notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}{page}</Layout>{loginOpen && <dialog open className="login-modal"><button className="dialog-close" onClick={() => setLoginOpen(false)}>×</button><p className="eyebrow">SUA CONTA</p><h2>Entre para continuar</h2><form onSubmit={login}><label>E-mail<input name="email" type="email" required /></label><label>Senha<input name="password" type="password" required /></label><button className="primary">Entrar</button></form></dialog>}</>; }
