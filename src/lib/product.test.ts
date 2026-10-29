import { describe, expect, it, vi } from "vitest";
import type { Category, Product, ProductImage, Variant, VariantTier } from "../shared/types/domain";
import {
  appliedTier,
  applicableTier,
  clampQuantity,
  defaultVariant,
  departmentsWithProducts,
  effectiveCategoryId,
  galleryImages,
  handleLinkClick,
  isAvailable,
  isDisplayable,
  productIdFromPath,
  productPath,
  safeImageUrl,
  stockConflict,
  tierRows,
  variantUnitPrice,
} from "./product";

const tier = (id: string, min_quantity: number, unit_price: string): VariantTier => ({
  id,
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

describe("departamentos com produtos", () => {
  const cat = (id: string, is_active = true): Category => ({ id, name: id, is_active });
  const product = (
    id: string,
    categories: Category[],
    is_active = true,
    variants = [variant("v", 1)],
  ): Product => ({ id, name: id, is_active, categories, variants });
  const all = [cat("a"), cat("b"), cat("c"), cat("d", false)];
  const products = [
    product("1", [cat("a")]),
    product("2", [cat("b")], false),
    product("3", [cat("c")], true, [variant("v", 5, false)]),
    product("4", [cat("d")]),
  ];
  it("exibível exige produto ativo com variação ativa", () => {
    expect(products.map(isDisplayable)).toEqual([true, false, false, true]);
  });
  it("lista só departamentos ativos com produto exibível", () => {
    expect(departmentsWithProducts(all, products).map((c) => c.id)).toEqual(["a"]);
  });
  it("departamento oculto vira Todos", () => {
    const list = departmentsWithProducts(all, products);
    expect(effectiveCategoryId("a", list)).toBe("a");
    expect(effectiveCategoryId("b", list)).toBe("");
    expect(effectiveCategoryId("", list)).toBe("");
  });
});

describe("tabela da variação", () => {
  const withTable = (pricing_tiers?: VariantTier[], unit_price?: string): Variant => ({
    ...variant("v", 5),
    unit_price,
    pricing_tiers,
  });
  it("usa a tabela da própria variação, ordenada, com a linha de 1 unidade", () => {
    const rows = tierRows(withTable([tier("b", 10, "9"), tier("a", 1, "10")], "10.00"));
    expect(rows.map((r) => r.min_quantity)).toEqual([1, 10]);
  });
  it("sem linha de 1 unidade, completa com unit_price e cai em base_price", () => {
    expect(tierRows(withTable([tier("b", 10, "9")], "12.00"))[0]?.unit_price).toBe("12.00");
    expect(tierRows(withTable(undefined))[0]?.unit_price).toBe("10.00");
    expect(variantUnitPrice(withTable(undefined, "11.00"))).toBe("11.00");
  });
  it("faixas de uma variação não vazam para outra", () => {
    const a = withTable([tier("a1", 1, "10"), tier("a5", 5, "8")], "10");
    const b = { ...withTable([tier("b1", 1, "20")], "20"), id: "w" };
    expect(tierRows(a)).toHaveLength(2);
    expect(tierRows(b).map((r) => r.id)).toEqual(["b1"]);
  });
  it("faixa aplicada no item: só acima de 1 unidade e até a quantidade", () => {
    const v = withTable([tier("a", 1, "10.00"), tier("b", 10, "9.00"), tier("c", 50, "8.00")]);
    expect(appliedTier(v, "10.00", 3)).toBeUndefined();
    expect(appliedTier(v, "9.00", 12)?.min_quantity).toBe(10);
    expect(appliedTier(v, "8.00", 60)?.min_quantity).toBe(50);
    expect(appliedTier(v, "8.00", 12)).toBeUndefined();
    expect(appliedTier(v, undefined, 12)).toBeUndefined();
  });
});

describe("conflito de estoque", () => {
  it("só o 409 com available numérico vira conflito", () => {
    expect(stockConflict({ status: 409, available: 3, message: "Sem estoque" })).toEqual({
      message: "Sem estoque",
      available: 3,
    });
    expect(stockConflict({ status: 409, available: 0 })?.available).toBe(0);
    expect(stockConflict({ status: 409 })).toBeNull();
    expect(stockConflict({ status: 500, available: 3 })).toBeNull();
    expect(stockConflict(null)).toBeNull();
  });
});
