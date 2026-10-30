import { describe, expect, it } from "vitest";
import { formatVariationName } from "./variation";

describe("formatVariationName", () => {
  it("coloca espaço depois de ':' colado", () => {
    expect(formatVariationName("Cor:Preto")).toBe("Cor: Preto");
    expect(formatVariationName("Cor:Preto;Tamanho:M")).toBe("Cor: Preto;Tamanho: M");
  });
  it("mantém o que já está formatado ou sem ':'", () => {
    expect(formatVariationName("Cor: Preto")).toBe("Cor: Preto");
    expect(formatVariationName("Fardo 5kg")).toBe("Fardo 5kg");
    expect(formatVariationName("")).toBe("");
  });
  it("não mexe em horas e razões numéricas", () => {
    expect(formatVariationName("1:2")).toBe("1:2");
  });
});
