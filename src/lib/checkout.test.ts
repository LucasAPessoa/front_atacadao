import { describe, expect, it } from "vitest";
import {
  cartItemName,
  cleanServiceName,
  formatDeliveryTime,
  formatZip,
  shippingLabel,
  summaryAmounts,
} from "./checkout";

describe("checkout", () => {
  it("resumo usa price como frete e total_amount como total da API", () => {
    const s = summaryAmounts("54.90", { price: "57.65", total_amount: "112.55" });
    expect(s).toEqual({ products: "54.90", shipping: "57.65", total: "112.55" });
  });
  it("sem frete selecionado não há frete nem total", () => {
    expect(summaryAmounts("54.90", undefined).total).toBeNull();
  });
  it("prazo singular e plural", () => {
    expect(formatDeliveryTime(1)).toBe("até 1 dia útil");
    expect(formatDeliveryTime(7)).toBe("até 7 dias úteis");
    expect(formatDeliveryTime(undefined)).toBeNull();
  });
  it("nome do serviço sem ponto inicial", () => {
    expect(cleanServiceName(".Package")).toBe("Package");
    expect(shippingLabel({ company_name: "Jadlog", service_name: ".Com" })).toBe("Jadlog Com");
    expect(shippingLabel({ company_name: "Correios", service_name: "SEDEX" })).toBe(
      "Correios SEDEX",
    );
  });
  it("CEP com hífen", () => {
    expect(formatZip("01310100")).toBe("01310-100");
    expect(formatZip("01310-100")).toBe("01310-100");
  });
  it("nome do item com produto e variação", () => {
    expect(cartItemName("Refrigerante Cola 2L", "Fardo com 6")).toBe(
      "Refrigerante Cola 2L · Fardo com 6",
    );
    expect(cartItemName(undefined, "Fardo com 6")).toBe("Fardo com 6");
  });
});
