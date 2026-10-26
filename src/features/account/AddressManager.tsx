import { useState } from "react";
import { formatZip } from "../../lib/checkout";
import { ApiError, api } from "../../services/client";
import type { Address } from "../../shared/types/domain";
import { AddressForm } from "./AddressForm";

type Props = {
  token: string;
  addresses: Address[];
  onChanged(): Promise<void> | void;
  onError(error: unknown): void;
};

export function AddressManager({ token, addresses, onChanged, onError }: Props) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await onChanged();
      setEditing(null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) onError(error);
      else
        setMessage(
          error instanceof ApiError && typeof error.message === "string"
            ? error.message
            : "Não foi possível concluir a ação. Tente novamente.",
        );
    } finally {
      setBusy(false);
    }
  }
  const saved = async () => {
    await onChanged();
    setEditing(null);
  };
  return (
    <section className="account-panel address-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">ENTREGA</p>
          <h2>Seus endereços</h2>
        </div>
        {editing !== "new" && (
          <button type="button" className="link-button" onClick={() => setEditing("new")}>
            Novo endereço +
          </button>
        )}
      </div>
      {message && (
        <p className="auth-message" role="alert">
          {message}
        </p>
      )}
      {editing === "new" && (
        <AddressForm
          token={token}
          makeDefault={!addresses.length}
          onSaved={saved}
          onCancel={() => setEditing(null)}
          onSessionError={onError}
        />
      )}
      {!addresses.length && editing !== "new" ? (
        <div className="empty-inline">
          <strong>Nenhum endereço cadastrado.</strong>
          <p>Cadastre um endereço para calcular a entrega no carrinho.</p>
        </div>
      ) : (
        addresses.map((a) => (
          <article className="address-row" key={a.id}>
            {editing === a.id ? (
              <AddressForm
                token={token}
                address={a}
                onSaved={saved}
                onCancel={() => setEditing(null)}
                onSessionError={onError}
              />
            ) : (
              <>
                <div>
                  <strong>
                    {a.street}, {a.number || "s/n"}
                    {a.complement ? ` · ${a.complement}` : ""}
                    {a.is_default && <em className="address-badge">Padrão</em>}
                  </strong>
                  <small>
                    {a.neighborhood ? `${a.neighborhood} · ` : ""}
                    {a.city}/{a.state} · {formatZip(a.zip_code)}
                  </small>
                </div>
                <div className="address-actions">
                  <button
                    type="button"
                    className="link-button"
                    disabled={busy}
                    onClick={() => setEditing(a.id)}
                  >
                    Editar
                  </button>
                  {!a.is_default && (
                    <button
                      type="button"
                      className="link-button"
                      disabled={busy}
                      onClick={() => run(() => api.setDefaultAddress(token, a.id))}
                    >
                      Tornar padrão
                    </button>
                  )}
                  <button
                    type="button"
                    className="remove"
                    disabled={busy}
                    onClick={() =>
                      window.confirm("Excluir este endereço?") &&
                      run(() => api.deleteAddress(token, a.id))
                    }
                  >
                    Excluir
                  </button>
                </div>
              </>
            )}
          </article>
        ))
      )}
    </section>
  );
}
