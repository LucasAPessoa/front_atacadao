export type StoreTheme = {
  brand: string;
};

export type StoreConfig = {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  announcement: string;
  supportEmail: string;
  legalName?: string;
  cnpj?: string;
  address?: string;
  theme: StoreTheme;
};

const env = import.meta.env;
const read = (value: string | undefined, fallback: string) => value?.trim() || fallback;
const optional = (value: string | undefined) => value?.trim() || undefined;

export const store: StoreConfig = {
  name: read(env.VITE_STORE_NAME, "Casa & Atacado"),
  shortName: read(env.VITE_STORE_SHORT_NAME, "CA"),
  tagline: read(env.VITE_STORE_TAGLINE, "Escolhas que abastecem a sua rotina."),
  description: read(
    env.VITE_STORE_DESCRIPTION,
    "Uma vitrine pronta para receber a identidade, o catálogo e as regras da sua loja.",
  ),
  announcement: read(
    env.VITE_STORE_ANNOUNCEMENT,
    "Frete calculado com transparência antes do pagamento.",
  ),
  supportEmail: read(env.VITE_STORE_SUPPORT_EMAIL, "atendimento@sualoja.com"),
  legalName: optional(env.VITE_STORE_LEGAL_NAME),
  cnpj: optional(env.VITE_STORE_CNPJ),
  address: optional(env.VITE_STORE_ADDRESS),
  theme: { brand: read(env.VITE_STORE_BRAND_COLOR, "#FF3B00") },
};
