import { useEffect, useRef, useState } from "react";
import { api } from "../../services/client";
import type { Address, Cart, CartItem, CheckoutPreview } from "../../shared/types/domain";
import { money } from "../../lib/format";
import {
  cartItemName,
  formatDeliveryTime,
  formatZip,
  shippingLabel,
  summaryAmounts,
} from "../../lib/checkout";
import { navigate } from "../../components/Layout";
import { AddressForm } from "../account/AddressForm";

// Papéis explícitos: no celular a tabela vira grid e perderia a semântica no Safari/Firefox.
const ROLE = {
  table: { role: "table" },
  rowgroup: { role: "rowgroup" },
  row: { role: "row" },
  columnheader: { role: "columnheader" },
  cell: { role: "cell" },
} as const;

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
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const preferred = useRef("");
  const key = useRef(crypto.randomUUID());
  useEffect(() => {
    api
      .products()
      .then((list) => setProductNames(Object.fromEntries(list.map((p) => [p.id, p.name]))))
      .catch(() => {});
  }, []);
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
  const itemName = (item: CartItem) =>
    cartItemName(
      preview?.items?.find((p) => p.variant_id === item.variant_id)?.product_name ??
        (item.variant.product_id ? productNames[item.variant.product_id] : undefined),
      item.variant.variation_name,
    );
  const amounts = summaryAmounts(preview?.subtotal_amount ?? total, selectedShipping);
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
            <table className="cart-items" {...ROLE.table}>
              <caption className="sr-only">Itens do carrinho</caption>
              <thead {...ROLE.rowgroup}>
                <tr {...ROLE.row}>
                  <th {...ROLE.columnheader} scope="col">
                    Produto
                  </th>
                  <th {...ROLE.columnheader} scope="col">
                    Qtd.
                  </th>
                  <th {...ROLE.columnheader} scope="col" className="num-col">
                    Total
                  </th>
                  <th {...ROLE.columnheader} scope="col">
                    <span className="sr-only">Remover</span>
                  </th>
                </tr>
              </thead>
              <tbody {...ROLE.rowgroup}>
                {cart.items.map((item) => (
                  <tr {...ROLE.row} key={item.id}>
                    <td {...ROLE.cell}>
                      <div className="cart-product">
                        <div className="cart-thumb" aria-hidden="true">
                          {itemName(item).slice(0, 2)}
                        </div>
                        <div>
                          <h2>{itemName(item)}</h2>
                          <span className="unit-price">
                            {money(item.unit_price ?? item.variant.base_price)} / un.
                          </span>
                        </div>
                      </div>
                    </td>
                    <td {...ROLE.cell}>
                      <div className="quantity">
                        <button
                          type="button"
                          aria-label={`Diminuir quantidade de ${itemName(item)}`}
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
                          aria-label={`Aumentar quantidade de ${itemName(item)}`}
                          disabled={busy}
                          onClick={() => quantity(item, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td {...ROLE.cell} className="line-total num-col">
                      {money(item.subtotal ?? Number(item.variant.base_price) * item.quantity)}
                    </td>
                    <td {...ROLE.cell}>
                      <button
                        type="button"
                        className="remove"
                        aria-label={`Remover ${itemName(item)}`}
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
                      {a.street}, {a.number || "s/n"} · {formatZip(a.zip_code)}
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
                      {shippingLabel(item)}
                      {formatDeliveryTime(item.delivery_time_days) && (
                        <span className="eta">
                          {" "}
                          / {formatDeliveryTime(item.delivery_time_days)}
                        </span>
                      )}
                    </span>
                    <strong>{money(item.price)}</strong>
                  </label>
                ))}
              </fieldset>
            )}
            <dl className="totals">
              <div>
                <dt>Produtos</dt>
                <dd>{money(amounts.products)}</dd>
              </div>
              {amounts.total !== null && (
                <>
                  <div>
                    <dt>Frete</dt>
                    <dd>{money(amounts.shipping ?? 0)}</dd>
                  </div>
                  <div className="grand">
                    <dt className="grand-label">Total</dt>
                    <dd className="grand-value">{money(amounts.total)}</dd>
                  </div>
                </>
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
