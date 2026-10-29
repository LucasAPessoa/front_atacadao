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
