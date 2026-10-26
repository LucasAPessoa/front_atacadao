import DOMPurify from "dompurify";

/** Só tags de texto, sem nenhum atributo (style, on*, href, src...). */
export const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "h3",
  "h4",
  "span",
];

const HTML_HINT = /<\/?[a-z][^>]*>/i;

export const looksLikeHtml = (value: string) => HTML_HINT.test(value);

const escapeText = (value: string) =>
  value
    .replace(/&(?!#?\w+;)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Sem DOM (SSR/testes): reconstrói só as tags permitidas, sem atributos; o resto vira texto escapado. */
const sanitizeWithoutDom = (value: string): string => {
  const stripped = value
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(new RegExp(`<\\/?(?!(?:${ALLOWED_TAGS.join("|")})[\\s/>])[a-z][^>]*>`, "gi"), "");
  const tag = new RegExp(`<(/?)(${ALLOWED_TAGS.join("|")})(?=[\\s/>])[^>]*>`, "gi");
  let out = "";
  let last = 0;
  for (const match of stripped.matchAll(tag)) {
    out += escapeText(stripped.slice(last, match.index));
    out += `<${match[1]}${match[2].toLowerCase()}>`;
    last = match.index + match[0].length;
  }
  return out + escapeText(stripped.slice(last));
};

/** HTML seguro para exibir descrições vindas do Bling. */
export const sanitizeDescription = (raw: string): string => {
  if (!DOMPurify.isSupported) return sanitizeWithoutDom(raw);
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};
