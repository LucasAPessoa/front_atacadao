// @ts-expect-error o projeto não tem @types/node; o Vitest roda em Node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { luminance } from "./theme";

const css: string = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const root = css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));
const token = (name: string) => {
  const hex = new RegExp(`--${name}:\\s*#([0-9a-f]{6})`, "i").exec(root)?.[1];
  if (!hex) throw new Error(`token --${name} ausente`);
  const n = Number.parseInt(hex, 16);
  return luminance([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
};
const ratio = (fg: string, bg: string) => {
  const [a, b] = [token(fg), token(bg)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

describe("tokens Gôndola", () => {
  it.each([
    ["ink", "card", 4.5],
    ["ink", "paper", 4.5],
    ["muted", "card", 4.5],
    ["muted", "paper", 4.5],
    ["brand", "card", 4.5],
    ["on-brand", "brand", 4.5],
    ["danger", "card", 4.5],
    ["tier-tip", "tier-tip-bg", 4.5],
    ["on-ink", "ink", 4.5],
    ["on-ink-muted", "ink", 4.5],
    ["field-border", "card", 3],
  ])("--%s sobre --%s tem contraste >= %s", (fg, bg, min) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});
