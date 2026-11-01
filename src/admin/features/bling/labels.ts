/**
 * Textos em português para eventos, fases e códigos que a API do Bling devolve crus.
 * Código desconhecido nunca aparece na tela: cai num texto genérico.
 */

/** Datas da integração no fuso da loja. */
export function formatBlingDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export const eventLabels: Record<string, string> = {
  CONNECTED: "Conectado",
  REFRESHED: "Autorização renovada",
  REFRESH_FAILED: "Falha ao renovar a autorização",
  RECONNECT_REQUIRED: "Reconexão necessária",
  DISCONNECTED: "Desconectado",
  CONNECT_REJECTED: "Conexão recusada",
};

/** Motivos de eventos e do último erro da conexão. */
const connectionReasons: Record<string, string> = {
  autorizacao_recusada: "a autorização foi recusada no Bling",
  troca_do_codigo_falhou: "o Bling não concluiu a autorização",
  empresa_diferente: "a conta autorizada é de outra empresa",
  desconectado_pelo_admin: "desconectado por um administrador",
  invalid_grant: "a autorização expirou ou foi revogada",
  api_unauthorized: "o Bling recusou o acesso",
  token_decrypt_failed: "falha interna ao ler a autorização",
  token_encrypt_failed: "falha interna ao gravar a autorização",
};

export function connectionReason(code: string | null | undefined): string {
  if (!code) return "";
  if (connectionReasons[code]) return connectionReasons[code];
  if (/^rejected_\d+$/.test(code)) return "o Bling recusou a renovação";
  return "motivo não identificado";
}

/** Evento + motivo que só repetiria o rótulo vira uma frase só. */
const eventPhrases: Record<string, string> = {
  "DISCONNECTED:desconectado_pelo_admin": "Desconectado por um administrador",
  "CONNECT_REJECTED:autorizacao_recusada": "Conexão recusada no Bling",
};

export const eventText = (event: string, reason: string | null) => {
  const phrase = eventPhrases[`${event}:${reason}`];
  if (phrase) return phrase;
  const label = eventLabels[event] ?? "Evento da integração";
  const why = connectionReason(reason);
  return why ? `${label}: ${why}` : label;
};

export const phaseLabels: Record<string, string> = {
  IDLE: "Aguardando",
  CATEGORIES: "Lendo categorias",
  SCAN: "Lendo a lista de produtos",
  DETAILS: "Lendo os detalhes dos produtos",
  STOCK: "Lendo o estoque",
  FINALIZE: "Finalizando",
};

export const phaseText = (phase: string | null | undefined) =>
  phase ? (phaseLabels[phase] ?? "Em andamento") : "—";

/** Motivo de uma importação ignorada ou parcial. */
const runReasons: Record<string, string> = {
  bling_not_connected: "o Bling não estava conectado",
  bling_reconnect_required: "o Bling precisava ser reconectado",
  scan_vazio: "o Bling não devolveu produtos; nada foi desativado",
};

export const runReasonText = (reason: string | null | undefined) =>
  reason ? (runReasons[reason] ?? "motivo não identificado") : "";

const readTargets: Record<string, string> = {
  categorias: "as categorias",
  produtos: "a lista de produtos",
  saldos: "o estoque",
  detalhe: "o detalhe do produto",
};

/** Códigos dos erros por produto da importação. */
const errorLabels: Record<string, string> = {
  incompleto_peso: "Fora de venda: sem peso no Bling",
  incompleto_medidas: "Fora de venda: sem medidas no Bling",
  incompleto_preco: "Fora de venda: sem preço cadastrado para o site no Bling",
  categoria_desconhecida: "Categoria não encontrada; produto ficou sem categoria",
  filtro_alteracao_ignorado:
    "O Bling não filtrou só as alterações; a atualização completa roda uma vez por dia",
  gravacao_falhou: "Falha ao gravar o produto",
};

export function syncErrorText(code: string): string {
  if (errorLabels[code]) return errorLabels[code];
  const read = /^leitura_(.+)$/.exec(code);
  if (read) return `Falha ao ler ${readTargets[read[1]] ?? "dados"} do Bling`;
  return "Falha ao importar";
}

export const syncErrorTarget = (blingId: number | string | null) =>
  blingId === null || blingId === "" ? "Geral" : `Produto ${blingId} no Bling`;
