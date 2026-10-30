import { describe, expect, it } from "vitest";
import { normalizePrice } from "./price";

describe("normalizePrice", () => {
  it("aceita vírgula e normaliza para 2 casas", () => {
    expect(normalizePrice("19,90")).toBe("19.90");
    expect(normalizePrice("19.9")).toBe("19.90");
    expect(normalizePrice(" 5 ")).toBe("5.00");
    for (const bad of ["0", "0,00", "-1", "1,999", "abc", "", "1.234,50"])
      expect(normalizePrice(bad)).toBeNull();
  });
});
