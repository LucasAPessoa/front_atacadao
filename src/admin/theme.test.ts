// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { THEME, applyTheme } from "./theme";

describe("tema do admin (#74)", () => {
  it("só define o tema: não grava a cor da marca da loja no acento", () => {
    const root = document.createElement("html");
    applyTheme(root);
    expect(root.dataset.theme).toBe(THEME);
    expect(root.style.getPropertyValue("--adm-accent")).toBe("");
    expect(root.style.getPropertyValue("--adm-accent-text")).toBe("");
  });
});
