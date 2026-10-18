import { type FormEvent, useRef, useState } from "react";
import {
  type AddressErrors,
  type AddressFormValues,
  emptyAddress,
  toAddressPayload,
  validateAddress,
} from "../../lib/address";
import { ApiError, api } from "../../services/client";
import type { Address } from "../../types/domain";

const fromAddress = (a: Address): AddressFormValues => ({
  zip_code: a.zip_code,
  street: a.street,
  number: a.number ?? "",
  complement: a.complement ?? "",
  neighborhood: a.neighborhood ?? "",
  city: a.city,
  state: a.state,
});
const apiMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.status === 422 || typeof error.message !== "string"
      ? "Revise os dados informados e tente novamente."
      : error.message
    : "Não foi possível salvar o endereço. Tente novamente.";

type Props = {
  token: string;
  address?: Address;
  makeDefault?: boolean;
  onSaved(address: Address): Promise<void> | void;
  onCancel?(): void;
  onSessionError(error: unknown): void;
};

export function AddressForm({
  token,
  address,
  makeDefault,
  onSaved,
  onCancel,
  onSessionError,
}: Props) {
  const [values, setValues] = useState<AddressFormValues>(
    address ? fromAddress(address) : emptyAddress,
  );
  const [errors, setErrors] = useState<AddressErrors>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<Address | null>(null);
  const field = (
    name: keyof AddressFormValues,
    label: string,
    extra: { maxLength?: number; required?: boolean } = {},
  ) => (
    <label>
      {label}
      <input
        name={name}
        value={values[name]}
        maxLength={extra.maxLength}
        required={extra.required}
        aria-invalid={!!errors[name]}
        onChange={(e) => setValues({ ...values, [name]: e.target.value })}
      />
      {errors[name] && <small role="alert">{errors[name]}</small>}
    </label>
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = validateAddress(values);
    setErrors(found);
    setMessage("");
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      if (!pending.current) {
        const payload = toAddressPayload(values, address ? "update" : "create");
        pending.current = address
          ? await api.updateAddress(
              token,
              address.id,
              payload as Parameters<typeof api.updateAddress>[2],
            )
          : await api.createAddress(token, {
              ...(payload as Parameters<typeof api.createAddress>[1]),
              is_default: makeDefault,
            });
      }
      await onSaved(pending.current);
      pending.current = null;
      if (!address) setValues(emptyAddress);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) onSessionError(error);
      else
        setMessage(
          pending.current
            ? "Endereço salvo, mas não foi possível atualizar a lista. Tente novamente."
            : apiMessage(error),
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="address-form" onSubmit={submit} noValidate>
      {field("zip_code", "CEP", { maxLength: 10, required: true })}
      {field("street", "Rua", { maxLength: 200, required: true })}
      {field("number", "Número", { maxLength: 20 })}
      {field("complement", "Complemento", { maxLength: 100 })}
      {field("neighborhood", "Bairro", { maxLength: 100 })}
      {field("city", "Cidade", { maxLength: 100, required: true })}
      {field("state", "UF", { maxLength: 2, required: true })}
      {message && (
        <p className="auth-message" role="alert">
          {message}
        </p>
      )}
      <div className="address-actions">
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "Salvando…" : address ? "Salvar alterações" : "Salvar endereço"}
        </button>
        {onCancel && (
          <button type="button" className="secondary" disabled={busy} onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
