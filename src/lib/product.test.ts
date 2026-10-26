import { describe, expect, it, vi } from "vitest";
import type { PricingTier, ProductImage, Variant } from "../types/domain";
import {
  applicableTier,
  clampQuantity,
  defaultVariant,
  galleryImages,
  handleLinkClick,
  isAvailable,
  productIdFromPath,
  productPath,
  safeImageUrl,
} from "./product";

const tier = (id: string, min_quantity: number, unit_price: string): PricingTier => ({
  id,
  product_id: "p",
  min_quantity,
  unit_price,
});
const variant = (id: string, stock_quantity: number, is_active = true): Variant => ({
  id,
  variation_name: id,
  base_price: "10.00",
  stock_quantity,
  is_active,
});

describe("faixa aplicável", () => {
  const tiers = [tier("a", 1, "10"), tier("b", 10, "9"), tier("c", 50, "8")];
  it("escolhe a maior faixa que não excede a quantidade", () => {
    expect(applicableTier(tiers, 1)?.id).toBe("a");
    expect(applicableTier(tiers, 9)?.id).toBe("a");
    expect(applicableTier(tiers, 10)?.id).toBe("b");
    expect(applicableTier(tiers, 500)?.id).toBe("c");
  });
  it("sem faixa alcançada ou sem faixas, não destaca nada", () => {
    expect(applicableTier([tier("b", 10, "9")], 3)).toBeUndefined();
    expect(applicableTier([], 3)).toBeUndefined();
  });
});

describe("variações", () => {
  it("sem estoque ou inativa é indisponível", () => {
    expect(isAvailable(variant("v", 3))).toBe(true);
    expect(isAvailable(variant("v", 0))).toBe(false);
    expect(isAvailable(variant("v", 3, false))).toBe(false);
  });
  it("seleciona primeiro a primeira disponível", () => {
    expect(defaultVariant([variant("x", 0), variant("y", 2)])?.id).toBe("y");
    expect(defaultVariant([variant("x", 0)])?.id).toBe("x");
    expect(defaultVariant([])).toBeUndefined();
  });
  it("limita a quantidade entre 1 e o estoque", () => {
    expect(clampQuantity(0, 5)).toBe(1);
    expect(clampQuantity(9, 5)).toBe(5);
    expect(clampQuantity(Number.NaN, 5)).toBe(1);
    expect(clampQuantity(2.7, 5)).toBe(2);
  });
});

describe("galeria e rotas", () => {
  const image = (id: string, variant_id: string, is_main = false): ProductImage => ({
    id,
    variant_id,
    image_url: `/${id}.png`,
    is_main,
  });
  it("prioriza imagens da variação e coloca a principal primeiro", () => {
    const list = [image("1", "a"), image("2", "b"), image("3", "b", true)];
    expect(galleryImages(list, "b").map((i) => i.id)).toEqual(["3", "2"]);
    expect(galleryImages(list, "z").length).toBe(3);
    expect(galleryImages([], "a")).toEqual([]);
  });
  it("monta e interpreta /produtos/:id", () => {
    expect(productPath("abc")).toBe("/produtos/abc");
    expect(productIdFromPath("/produtos/abc")).toBe("abc");
    expect(productIdFromPath("/produtos")).toBeNull();
    expect(productIdFromPath("/produtos/a/b")).toBeNull();
  });
});

describe("links e imagens", () => {
  const click = (over: Partial<Parameters<typeof handleLinkClick>[0]> = {}) => ({
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    ...over,
  });
  it("clique simples navega com preventDefault", () => {
    const e = click();
    const go = vi.fn();
    expect(handleLinkClick(e, "/produtos/1", go)).toBe(true);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(go).toHaveBeenCalledWith("/produtos/1");
  });
  it("ctrl, meta, shift e botão do meio seguem o href", () => {
    for (const over of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }]) {
      const e = click(over);
      const go = vi.fn();
      expect(handleLinkClick(e, "/x", go)).toBe(false);
      expect(e.preventDefault).not.toHaveBeenCalled();
      expect(go).not.toHaveBeenCalled();
    }
  });
  it("safeImageUrl aceita http(s) e relativo; rejeita o resto", () => {
    expect(safeImageUrl("https://cdn.x/a.png")).toBe("https://cdn.x/a.png");
    expect(safeImageUrl("/img/a.png")).toBe("/img/a.png");
    for (const bad of [
      "javascript:alert(1)",
      "data:image/png;base64,AA",
      "//evil.com/a",
      "",
      null,
      "a.png",
    ])
      expect(safeImageUrl(bad)).toBeNull();
  });
});
