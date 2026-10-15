import { describe, expect, it } from "vitest";
import { money } from "./format";

const normalize = (value: string) => value.replace(/\s/g, " ");

describe("money", () => {
  it("formata números em BRL", () => {
    expect(normalize(money(1234.5))).toBe("R$ 1.234,50");
  });

  it("aceita strings numéricas (decimais da API)", () => {
    expect(normalize(money("10.00"))).toBe("R$ 10,00");
  });

  it("formata zero", () => {
    expect(normalize(money(0))).toBe("R$ 0,00");
  });
});
