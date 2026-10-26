import DOMPurify from "dompurify";

const TAGS = ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h3", "h4", "span"];

/** HTML de descrição pronto para exibir: só tags de texto, sem atributos, scripts ou estilos. */
export const sanitizeHtml = (value: string): string =>
  DOMPurify.sanitize(value, { ALLOWED_TAGS: TAGS, ALLOWED_ATTR: [] });
