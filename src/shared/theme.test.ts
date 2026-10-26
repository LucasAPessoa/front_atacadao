import { describe, expect, it } from "vitest";
import { brandTokens, luminance } from "./theme";

const parseRgb = (value: string) =>
  (value.match(/\d+/g) ?? []).map(Number) as [number, number, number];
const contrastWithWhite = (value: string) => 1.05 / (luminance(parseRgb(value)) + 0.05);

describe("brandTokens", () => {
  it("usa texto escuro sobre marca clara", () => {
    expect(brandTokens("#FFD400").onBrand).toBe("#0A0A0A");
  });
  it("usa texto branco sobre marca escura", () => {
    expect(brandTokens("#0047FF").onBrand).toBe("#FFFFFF");
  });
  it("cai no padrão com hex inválido", () => {
    expect(brandTokens("laranja").brand).toBe("#FF3B00");
    expect(brandTokens("").brand).toBe("#FF3B00");
    expect(brandTokens("#12345").brand).toBe("#FF3B00");
  });
  it("aceita 3 dígitos", () => {
    const tokens = brandTokens("#fff");
    expect(tokens.brand).toBe("#fff");
    expect(tokens.onBrand).toBe("#0A0A0A");
  });
  it.each(["#FF3B00", "#FFD400", "#00875A", "#0A0A0A", "#fff", "bad"])(
    "brandText de %s tem contraste AA com branco",
    (hex) => {
      expect(contrastWithWhite(brandTokens(hex).brandText)).toBeGreaterThanOrEqual(4.5);
    },
  );
  it.each(["#FF3B00", "#0047FF", "#00875A", "#FFD000", "#111111", "#7CFFB2"])(
    "onBrand de %s tem contraste >= 4,5 com a marca",
    (hex) => {
      const tokens = brandTokens(hex);
      const parse = (v: string) => {
        const n = Number.parseInt(v.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as [number, number, number];
      };
      const a = luminance(parse(tokens.brand));
      const b = luminance(parse(tokens.onBrand));
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    },
  );
  it("usa texto escuro na marca padrão", () => {
    expect(brandTokens("#FF3B00").onBrand).toBe("#0A0A0A");
  });
});
