import { describe, expect, it } from "vitest";
// @ts-expect-error: sem @types/node; o Vitest esvazia CSS importado, então lemos o arquivo do disco.
import { readFileSync } from "node:fs";
const css: string = readFileSync(new URL("../styles/components.css", import.meta.url), "utf8");
const mediaStart = css.indexOf("@media (max-width: 768px)");
const base = css.slice(0, mediaStart);
const media = css.slice(mediaStart);

const rule = (text: string, selector: string) =>
  new RegExp(`(?:^|\\n)\\s*${selector.replace(/\./g, "\\.")}\\s*\\{([^}]*)\\}`).exec(text)?.[1];

describe("botão Menu (regressão: .adm-btn sobrescrevia display: none)", () => {
  it("regra base esconde o botão com especificidade maior que .adm-btn", () => {
    expect(mediaStart).toBeGreaterThan(0);
    expect(rule(base, ".adm-btn.adm-menu-toggle")).toMatch(/display:\s*none/);
  });

  it("no breakpoint mobile o botão aparece", () => {
    expect(rule(media, ".adm-btn.adm-menu-toggle")).toMatch(/display:\s*inline-flex/);
  });

  it("não há regra .adm-menu-toggle sem .adm-btn", () => {
    expect(css).not.toMatch(/(^|[^\w-.])\.adm-menu-toggle/);
  });
});

describe("grids que estouravam a largura em 360px", () => {
  it(".adm-stack tem coluna minmax(0, 1fr)", () => {
    expect(rule(css, ".adm-stack")).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });

  it("o @media de .adm-dl vem depois da regra base (senão é anulado)", () => {
    const baseAt = css.search(/(?:^|\n)\.adm-dl\s*\{/);
    const mediaDl = /@media \(max-width: 768px\)\s*\{\s*\.adm-dl\s*\{[^}]*minmax\(0,\s*1fr\)/.exec(
      css,
    );
    expect(baseAt).toBeGreaterThan(-1);
    expect(mediaDl).not.toBeNull();
    expect(mediaDl?.index).toBeGreaterThan(baseAt);
  });

  it("valores numéricos de tabela não quebram linha", () => {
    expect(rule(css, ".adm-table .adm-num")).toMatch(/white-space:\s*nowrap/);
    expect(rule(css, ".adm-dl-money dd")).toMatch(/white-space:\s*nowrap/);
  });
});

/** Todas as declarações do seletor (pode haver mais de uma regra). */
const allRules = (text: string, selector: string) =>
  [
    ...text.matchAll(
      new RegExp(`(?:^|\\n)\\s*${selector.replace(/\./g, "\\.")}\\s*\\{([^}]*)\\}`, "g"),
    ),
  ]
    .map((m) => m[1])
    .join("\n");

describe("piso de legibilidade e alvos de toque (#75)", () => {
  const tokens: string = readFileSync(new URL("../styles/tokens.css", import.meta.url), "utf8");
  const baseCss: string = readFileSync(new URL("../styles/base.css", import.meta.url), "utf8");
  const all = [tokens, baseCss, css].join("\n");

  it("--adm-touch é 2.75rem (44px) e o texto pequeno não fica abaixo de 14px", () => {
    expect(tokens).toMatch(/--adm-touch:\s*2\.75rem/);
    expect(tokens).toMatch(/--adm-font-size-small:\s*0\.875rem/);
    expect(rule(baseCss, "small")).toMatch(/font-size:\s*var\(--adm-font-size-small\)/);
  });

  it("nenhum font-size literal abaixo de 14px no admin", () => {
    const sizes = [...all.matchAll(/font-size:\s*([0-9.]+)(rem|px)/g)].map(([, n, unit]) =>
      unit === "px" ? Number(n) : Number(n) * 16,
    );
    expect(sizes.length).toBeGreaterThan(0);
    for (const px of sizes) expect(px).toBeGreaterThanOrEqual(14);
    // Relativos e palavras-chave escapariam da conta acima: o admin não usa nenhum.
    expect(all).not.toMatch(/font-size:\s*(?:[0-9.]+(?:em|%)|x+-small|small|smaller)\s*;/);
  });

  it("nav, abas, ordenação, checkbox e botões usam --adm-touch", () => {
    for (const selector of [
      ".adm-nav a",
      ".adm-tab",
      ".adm-sort",
      ".adm-btn",
      ".adm-check-hit",
      ".adm-check-label",
      ".adm-switch",
      ".adm-toast button",
    ])
      expect(allRules(css, selector), selector).toMatch(/min-height:\s*var\(--adm-touch\)/);
    expect(css).not.toMatch(/min-height:\s*2\.75rem/);
  });
});

describe("Sistema Gôndola no admin (#74)", () => {
  const tokens: string = readFileSync(new URL("../styles/tokens.css", import.meta.url), "utf8");
  const token = (name: string) =>
    new RegExp(`--${name}:\\s*([^;]+);`).exec(tokens)?.[1].trim().toLowerCase();

  it("cores, raios e fontes seguem as artboards", () => {
    expect(token("adm-bg")).toBe("#f4f6f5");
    expect(token("adm-text")).toBe("#15201c");
    expect(token("adm-nav-bg")).toBe("#15201c");
    expect(token("adm-border")).toBe("#e1e6e3");
    expect(token("adm-radius")).toBe("10px");
    expect(token("adm-radius-lg")).toBe("16px");
    expect(token("adm-font")).toContain("Atkinson Hyperlegible Next".toLowerCase());
    expect(token("adm-font-display")).toContain("gabarito");
    expect(token("adm-font-size")).toBe("0.9375rem");
    expect(token("adm-row")).toBe("3rem");
  });

  it("acento é neutro escuro, não a cor da marca", () => {
    expect(token("adm-accent")).toBe("#15201c");
    expect(token("adm-on-accent")).toBe("#ffffff");
  });
});
