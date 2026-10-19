/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_STORE_NAME?: string;
  readonly VITE_STORE_SHORT_NAME?: string;
  readonly VITE_STORE_TAGLINE?: string;
  readonly VITE_STORE_DESCRIPTION?: string;
  readonly VITE_STORE_ANNOUNCEMENT?: string;
  readonly VITE_STORE_SUPPORT_EMAIL?: string;
  readonly VITE_STORE_BRAND_COLOR?: string;
  readonly VITE_STORE_LEGAL_NAME?: string;
  readonly VITE_STORE_CNPJ?: string;
  readonly VITE_STORE_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
