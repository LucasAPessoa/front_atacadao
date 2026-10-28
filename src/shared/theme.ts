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

const INK_RGB = parseHex(INK) as Rgb;
const WHITE_RGB = parseHex(WHITE) as Rgb;

function contrast(a: Rgb, b: Rgb): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
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
    onBrand: contrast(rgb, INK_RGB) >= contrast(rgb, WHITE_RGB) ? INK : WHITE,
    brandText: `rgb(${text.join(",")})`,
  };
}

/** Razão de contraste WCAG entre duas cores hex; 0 se alguma for inválida. */
export function contrastRatio(a: string, b: string): number {
  const [x, y] = [parseHex(a), parseHex(b)];
  return x && y ? contrast(x, y) : 0;
}
