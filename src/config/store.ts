export type StoreTheme = {
  accent: string;
  accentStrong: string;
  ink: string;
  parchment: string;
  surface: string;
  field: string;
  muted: string;
  border: string;
  leaf: string;
};

export type StoreConfig = {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  announcement: string;
  supportEmail: string;
  theme: StoreTheme;
};

export const store: StoreConfig = {
  name: "Casa & Atacado",
  shortName: "CA",
  tagline: "Escolhas que abastecem a sua rotina.",
  description: "Uma vitrine pronta para receber a identidade, o catálogo e as regras da sua loja.",
  announcement: "Frete calculado com transparência antes do pagamento.",
  supportEmail: "atendimento@sualoja.com",
  theme: {
    accent: "#e85d3f",
    accentStrong: "#c9432b",
    ink: "#1e2f31",
    parchment: "#f8f4ee",
    surface: "#fffdf9",
    field: "#f0ece5",
    muted: "#66706e",
    border: "#ded8ce",
    leaf: "#dfe9e0",
  },
};
