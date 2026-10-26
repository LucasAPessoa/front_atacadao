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
