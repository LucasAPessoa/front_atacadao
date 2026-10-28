export const DEFAULT_BRAND = "#1D6B57";
const INK = "#15201C";
const WHITE = "#FFFFFF";

type Rgb = [number, number, number];

function parseHex(hex: string): Rgb | null {
  let value = String(hex ?? "")
    .trim()
    .replace(/^#/, "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  const n = Number.parseInt(value, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export type BrandTokens = { brand: string; onBrand: string; brandText: string };

export function brandTokens(hex: string): BrandTokens {
  const rgb = parseHex(hex) ?? (parseHex(DEFAULT_BRAND) as Rgb);
  const brand = parseHex(hex) ? hex.trim() : DEFAULT_BRAND;
  let text: Rgb = [...rgb];
  while (luminance(text) > 0.15) {
    text = text.map((v) => Math.round(v * 0.88)) as Rgb;
  }
  return {
    brand: brand.startsWith("#") ? brand : `#${brand}`,
    onBrand: luminance(rgb) > 0.186 ? INK : WHITE,
    brandText: `rgb(${text.join(",")})`,
  };
}
