import { looksLikeHtml, sanitizeDescription } from "../lib/description";

/** Texto do catálogo: HTML sanitizado quando houver tags; senão texto puro com quebras preservadas. */
export function RichText({ value, className }: { value: string; className?: string }) {
  if (!looksLikeHtml(value)) {
    return <p className={`${className ?? ""} rich-plain`.trim()}>{value}</p>;
  }
  return (
    <div
      className={`${className ?? ""} rich-html`.trim()}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: conteúdo passa por sanitizeDescription (allowlist sem atributos)
      dangerouslySetInnerHTML={{ __html: sanitizeDescription(value) }}
    />
  );
}
