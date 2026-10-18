export type AddressFormValues = { zip_code: string; street: string; number: string; complement: string; neighborhood: string; city: string; state: string };
export type AddressErrors = Partial<Record<keyof AddressFormValues, string>>;

export const emptyAddress: AddressFormValues = { zip_code: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" };

export function validateAddress(values: AddressFormValues): AddressErrors {
  const errors: AddressErrors = {};
  if (values.zip_code.replace(/\D/g, "").length !== 8) errors.zip_code = "Informe um CEP com 8 dígitos.";
  if (!values.street.trim()) errors.street = "Informe a rua.";
  if (!values.city.trim()) errors.city = "Informe a cidade.";
  if (!/^[A-Za-z]{2}$/.test(values.state.trim())) errors.state = "Informe a UF com 2 letras.";
  return errors;
}

// Normaliza para o contrato da API: CEP só com dígitos, UF maiúscula.
// Opcionais vazios: omitidos no POST; null no PATCH (o backend usa exclude_unset e manteria o valor antigo).
export function toAddressPayload(values: AddressFormValues, mode: "create" | "update" = "create") {
  const optional = (value: string) => value.trim() || (mode === "update" ? null : undefined);
  return {
    zip_code: values.zip_code.replace(/\D/g, ""),
    street: values.street.trim(),
    number: optional(values.number),
    complement: optional(values.complement),
    neighborhood: optional(values.neighborhood),
    city: values.city.trim(),
    state: values.state.trim().toUpperCase(),
  };
}
