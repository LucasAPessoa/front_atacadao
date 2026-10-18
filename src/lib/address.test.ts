import { describe, expect, it } from "vitest";
import { emptyAddress, toAddressPayload, validateAddress } from "./address";

const valid = { ...emptyAddress, zip_code: "01310-100", street: "Av. Paulista", city: "São Paulo", state: "sp" };

describe("validateAddress", () => {
  it("aceita endereço válido e CEP formatado", () => {
    expect(validateAddress(valid)).toEqual({});
  });
  it("exige campos obrigatórios", () => {
    expect(Object.keys(validateAddress(emptyAddress)).sort()).toEqual(["city", "state", "street", "zip_code"]);
  });
  it("rejeita CEP fora de 8 dígitos e UF inválida", () => {
    expect(validateAddress({ ...valid, zip_code: "1234567" }).zip_code).toBeTruthy();
    expect(validateAddress({ ...valid, state: "S" }).state).toBeTruthy();
    expect(validateAddress({ ...valid, state: "S1" }).state).toBeTruthy();
  });
});

describe("toAddressPayload", () => {
  it("normaliza CEP, UF e omite opcionais vazios", () => {
    expect(toAddressPayload(valid)).toEqual({ zip_code: "01310100", street: "Av. Paulista", number: undefined, complement: undefined, neighborhood: undefined, city: "São Paulo", state: "SP" });
  });
  it("envia null para opcionais vazios no PATCH", () => {
    expect(toAddressPayload(valid, "update")).toMatchObject({ number: null, complement: null, neighborhood: null });
    expect(toAddressPayload({ ...valid, number: " 10 " }, "update").number).toBe("10");
  });
});
