// @vitest-environment jsdom
import DOMPurify from "dompurify";
import { describe, expect, it } from "vitest";
import { looksLikeHtml, sanitizeDescription } from "./description";

describe("sanitizeDescription", () => {
  it("mantém tags de texto permitidas", () => {
    const html = "<p>Olá <strong>mundo</strong><br><em>ok</em></p><ul><li>a</li></ul>";
    expect(sanitizeDescription(html)).toBe(html);
  });

  it("remove script, handlers e atributos", () => {
    const out = sanitizeDescription(
      '<p style="color:red" onclick="x()">a<script>alert(1)</script><img src=x onerror="y()"><a href="javascript:z()">l</a></p>',
    );
    expect(out).not.toMatch(/script|alert|onerror|onclick|style=|href|src=|<img|<a /i);
    expect(out).toContain("<p>a");
  });

  it("detecta HTML", () => {
    expect(looksLikeHtml("<p>x</p>")).toBe(true);
    expect(looksLikeHtml("linha 1\nlinha 2 < 3")).toBe(false);
  });

  it("usa DOMPurify quando há DOM", () => {
    expect(DOMPurify.isSupported).toBe(true);
    expect(sanitizeDescription('<b onmouseover="x">a</b>')).toBe("<b>a</b>");
    expect(sanitizeDescription("<p>a</p><script>alert(1)</script>")).toBe("<p>a</p>");
    expect(sanitizeDescription('<img src=x onerror="y()">t')).toBe("t");
  });
});
