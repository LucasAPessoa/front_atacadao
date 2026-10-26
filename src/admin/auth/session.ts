import { createRequester, createTokenStore } from "../../shared/http";

/** Chave própria do portal; a loja usa outra (src/services/client.ts). */
export const ADMIN_REFRESH_KEY = "atacadao.admin.refresh";

export const adminTokens = createTokenStore(ADMIN_REFRESH_KEY);
export const { request, requestPage } = createRequester(adminTokens);
