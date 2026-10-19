import { useEffect, useRef, useState } from "react";
import { api } from "../../services/client";
import type { Address, Cart, CartItem, CheckoutPreview } from "../../types/domain";
import { money } from "../../lib/format";
import { navigate } from "../../components/Layout";
import { AddressForm } from "../account/AddressForm";

export function CartPage({
  token,
  cart,
  addresses,
  onAddresses,
  onCart,
  onLogin,
  onError,
}: {
  token: string;
  cart: Cart | null;
  addresses: Address[];
  onAddresses(): Promise<void>;
  onCart(cart: Cart): void;
  onLogin(): void;
  onError(error: unknown): void;
}) {
  const [addressId, setAddressId] = useState("");
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [shippingId, setShippingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const preferred = useRef("");
  const key = useRef(crypto.randomUUID());
  useEffect(() => {
    const wanted = addresses.find((a) => a.id === preferred.current);
    preferred.current = "";
    setAddressId(wanted?.id ?? addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? "");
    setPreview(null);
    setShippingId(null);
  }, [addresses]);
  async function created(address: Address) {
    preferred.current = address.id;
    setPreview(null);
    setShippingId(null);
    try {
      await onAddresses();
      setAdding(false);
    } catch (error) {
      preferred.current = "";
      throw error;
    }
  }
  if (!token)
    return (
      <section className="cart-page">
        <p className="eyebrow">SEU CARRINHO</p>
        <h1>Entre para continuar sua compra.</h1>
        <button type="button" className="primary" onClick={onLogin}>
          Entrar
        </button>
      </section>
    );
  async function quantity(item: CartItem, next: number) {
    if (next < 1) return;
    setBusy(true);
    try {
      onCart(await api.updateCartItem(token, item.id, next));
      setPreview(null);
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: CartItem) {
    setBusy(true);
    try {
      onCart(await api.removeCartItem(token, item.id));
      setPreview(null);
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }
  async function review() {
    if (!addressId) return;
    setBusy(true);
    try {
      const value = await api.preview(token, addressId);
      setPreview(value);
      setShippingId(value.shipping_options[0]?.service_id ?? null);
      key.current = crypto.randomUUID();
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    const shipping = preview?.shipping_options.find((item) => item.service_id === shippingId);
    if (!shipping || !addressId) return;
    setBusy(true);
    try {
      const result = await api.mercadoPago(
        token,
        {
          address_id: addressId,
          shipping_service_id: shipping.service_id,
          expected_total_amount: shipping.total_amount,
        },
        key.current,
      );
      sessionStorage.setItem("ecommerce-atacadao.pending-order-id", result.order_id);
      window.location.assign(result.checkout_url);
    } catch (error) {
      onError(error);
      if ((error as { status?: number }).status === 409) setPreview(null);
    } finally {
      setBusy(false);
    }
  }
  const total =
    cart?.total_amount ??
    cart?.items
      .reduce(
        (sum, item) =>
          sum + Number(item.subtotal ?? Number(item.variant.base_price) * item.quantity),
        0,
      )
      .toFixed(2) ??
    "0";
  const selectedShipping = preview?.shipping_options.find((item) => item.service_id === shippingId);
  const step = preview ? 2 : 1;
  const stepClass = (n: number) => (n === step ? "current" : "");
  const count = String(cart?.total_items ?? 0).padStart(2, "0");
  return (
    <section className="cart-page">
      <div className="cart-title">
        <ol className="steps-bar" aria-label="Etapas da compra">
          <li className={stepClass(1)} aria-current={step === 1 ? "step" : undefined}>
            {step === 1 ? "[01 Carrinho]" : "01 Carrinho"}
          </li>
          <li className={stepClass(2)} aria-current={step === 2 ? "step" : undefined}>
            {step === 2 ? "[02 Entrega]" : "02 Entrega"}
          </li>
          <li>03 Pagamento</li>
        </ol>
        <h1>
          Carrinho<span className="title-count">[{count}]</span>
        </h1>
      </div>
      {!cart?.items.length ? (
        <div className="empty-cart">
          <h2>Seu carrinho está vazio.</h2>
          <p>Escolha produtos no catálogo para começar.</p>
          <button type="button" className="primary" onClick={() => navigate("/")}>
            Ver produtos
          </button>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="table-box">
            <table className="cart-items">
              <caption className="sr-only">Itens do carrinho</caption>
              <thead>
                <tr>
                  <th scope="col">Produto</th>
                  <th scope="col">Qtd.</th>
                  <th scope="col" className="num-col">
                    Total
                  </th>
                  <th scope="col">
                    <span className="sr-only">Remover</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="cart-product">
                        <div className="cart-thumb" aria-hidden="true">
                          {item.variant.variation_name.slice(0, 2)}
                        </div>
                        <div>
                          <h2>{item.variant.variation_name}</h2>
                          <span className="unit-price">
                            {money(item.unit_price ?? item.variant.base_price)} / un.
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="quantity">
                        <button
                          type="button"
                          aria-label={`Diminuir quantidade de ${item.variant.variation_name}`}
                          disabled={busy}
                          onClick={() => quantity(item, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span role="status" aria-label={`Quantidade: ${item.quantity}`}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Aumentar quantidade de ${item.variant.variation_name}`}
                          disabled={busy}
                          onClick={() => quantity(item, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="line-total num-col">
                      {money(item.subtotal ?? Number(item.variant.base_price) * item.quantity)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="remove"
                        aria-label={`Remover ${item.variant.variation_name}`}
                        onClick={() => remove(item)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="order-summary" aria-labelledby="resumo">
            <h2 id="resumo">Resumo</h2>
            <div className="summary-body">
              <label className="field">
                <span>Endereço de entrega</span>
                <select
                  value={addressId}
                  onChange={(e) => {
                    setAddressId(e.target.value);
                    setPreview(null);
                    setShippingId(null);
                  }}
                >
                  <option value="">Selecione</option>
                  {addresses.map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.street}, {a.number || "s/n"} · {a.zip_code}
                    </option>
                  ))}
                </select>
              </label>
              {!addresses.length || adding ? (
                <div className="cart-address-form">
                  <p className="payment-note">
                    {addresses.length
                      ? "Novo endereço de entrega"
                      : "Cadastre um endereço para calcular a entrega."}
                  </p>
                  <AddressForm
                    token={token}
                    makeDefault={!addresses.length}
                    onSaved={created}
                    onCancel={addresses.length ? () => setAdding(false) : undefined}
                    onSessionError={onError}
                  />
                </div>
              ) : (
                <button type="button" className="link-button" onClick={() => setAdding(true)}>
                  Usar outro endereço
                </button>
              )}
              <button
                type="button"
                className="secondary wide"
                disabled={busy || !addressId}
                onClick={review}
              >
                Calcular entrega
              </button>
            </div>
            {preview && (
              <fieldset className="shipping-options">
                <legend>Entrega</legend>
                {preview.shipping_options.map((item) => (
                  <label
                    key={item.service_id}
                    className={shippingId === item.service_id ? "on" : ""}
                  >
                    <input
                      type="radio"
                      name="frete"
                      checked={shippingId === item.service_id}
                      onChange={() => setShippingId(item.service_id)}
                    />
                    <span className="ship-name">
                      {item.company_name} · {item.service_name}
                      {item.delivery_time_days !== undefined && (
                        <span className="eta"> / {item.delivery_time_days} d</span>
                      )}
                    </span>
                    <strong>{money(item.total_amount)}</strong>
                  </label>
                ))}
              </fieldset>
            )}
            <dl className="totals">
              <div>
                <dt>Produtos</dt>
                <dd>{money(total)}</dd>
              </div>
              {selectedShipping && (
                <div className="grand">
                  <dt className="grand-label">Total</dt>
                  <dd className="grand-value">{money(selectedShipping.total_amount)}</dd>
                </div>
              )}
            </dl>
            <button
              type="button"
              className="checkout-cta"
              disabled={busy || !shippingId}
              onClick={pay}
            >
              Ir para pagamento seguro <span aria-hidden="true">→</span>
            </button>
            <p className="payment-note">
              O pagamento é concluído no Mercado Pago. Não pedimos dados de cartão aqui.
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
