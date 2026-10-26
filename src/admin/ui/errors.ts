import { ApiError } from "../../shared/http";

/** Mensagem em português para um erro de API, cobrindo os estados do portal. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sua sessão expirou. Entre novamente para continuar.";
    if (error.status === 403) return "Você não tem permissão para esta ação.";
    if (error.status === 404) return "Não encontrado. O item pode ter sido removido.";
    if (error.status === 409) return "O estado mudou. Atualize a página e tente novamente.";
    if (error.status === 422)
      return error.errors.length
        ? error.errors.map((e) => e.msg).join(" ")
        : "Os dados enviados são inválidos.";
    if (error.status === 429)
      return error.retryAfter
        ? `Muitas requisições. Tente novamente em ${error.retryAfter} s.`
        : "Muitas requisições. Aguarde um instante e tente novamente.";
    if (error.status === 503)
      return "Serviço indisponível no momento. Tente novamente em instantes.";
    if (error.status >= 500) return "Erro no servidor. Tente novamente em instantes.";
    return error.message;
  }
  return "Não foi possível falar com o servidor agora. Tente novamente.";
}

/** Erros 4xx não melhoram com nova tentativa. */
export const isClientError = (error: unknown) =>
  error instanceof ApiError && error.status >= 400 && error.status < 500;
