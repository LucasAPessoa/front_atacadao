export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export type Session = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type FieldError = { loc: (string | number)[]; msg: string };
export type PageMeta = { total: number; skip: number; limit: number };
export type Page<T> = { items: T[]; meta: PageMeta };

type Envelope<T> = { data: T; message?: string; meta?: PageMeta };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Erros por campo (422). */
    public readonly errors: FieldError[] = [],
    /** Segundos indicados em Retry-After (429/503), quando presentes. */
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}

const genericMessage = "Não foi possível concluir a solicitação.";

function fieldErrors(body: { errors?: unknown; detail?: unknown } | null): FieldError[] {
  const list = Array.isArray(body?.errors)
    ? body.errors
    : Array.isArray(body?.detail)
      ? body.detail
      : [];
  return list
    .filter((e): e is { loc?: unknown; msg: string } => typeof e?.msg === "string")
    .map((e) => ({ loc: Array.isArray(e.loc) ? e.loc : [], msg: e.msg }));
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

/** Faz a chamada e devolve o corpo completo (envelope). `init.signal` cancela a requisição. */
async function sendEnvelope<T>(
  path: string,
  init: RequestInit,
  bearer?: string,
): Promise<Envelope<T> | null> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = typeof body?.detail === "string" ? body.detail : undefined;
    throw new ApiError(
      response.status,
      detail ?? body?.message ?? genericMessage,
      fieldErrors(body),
      parseRetryAfter(response.headers?.get?.("Retry-After") ?? null),
    );
  }
  return body;
}

export async function send<T>(path: string, init: RequestInit, bearer?: string): Promise<T> {
  const body = await sendEnvelope<T>(path, init, bearer);
  return body === null ? (undefined as T) : body.data;
}

export async function sendPage<T>(
  path: string,
  init: RequestInit,
  bearer?: string,
): Promise<Page<T>> {
  const body = await sendEnvelope<T[]>(path, init, bearer);
  const items = body?.data ?? [];
  return { items, meta: body?.meta ?? { total: items.length, skip: 0, limit: items.length } };
}

export type TokenStore = {
  getAccessToken(): string;
  getRefreshToken(): string | null;
  hasStoredSession(): boolean;
  setOnSessionExpired(handler: () => void): void;
  storeSession(session: Session): void;
  clearSession(): void;
  /** Limpa a sessão e avisa o handler (401 sem refresh possível, 403 em /admin/*). */
  expireSession(): void;
  /** Single-flight: o refresh token é rotacionado, então dois refreshes concorrentes derrubariam a sessão. */
  refreshSession(notify?: boolean): Promise<string>;
};

/**
 * Access token apenas em memória; refresh token no localStorage sob `refreshKey`.
 * `legacyKeys` são removidas (tokens gravados por versões antigas).
 */
export function createTokenStore(refreshKey: string, legacyKeys: string[] = []): TokenStore {
  let accessToken = "";
  let onSessionExpired: () => void = () => undefined;
  let refreshInFlight: Promise<string> | null = null;

  const removeLegacy = () => {
    try {
      for (const key of legacyKeys) localStorage.removeItem(key);
    } catch {
      /* sem storage */
    }
  };
  removeLegacy();

  const store: TokenStore = {
    getAccessToken: () => accessToken,
    getRefreshToken: () => localStorage.getItem(refreshKey),
    hasStoredSession: () => Boolean(store.getRefreshToken()),
    setOnSessionExpired(handler) {
      onSessionExpired = handler;
    },
    storeSession(session) {
      accessToken = session.access_token;
      localStorage.setItem(refreshKey, session.refresh_token);
    },
    clearSession() {
      accessToken = "";
      localStorage.removeItem(refreshKey);
      removeLegacy();
    },
    expireSession() {
      store.clearSession();
      onSessionExpired();
    },
    refreshSession(notify = true) {
      refreshInFlight ??= (async () => {
        const refreshToken = store.getRefreshToken();
        if (!refreshToken) throw new ApiError(401, "Sessão expirada.");
        try {
          const session = await send<Session>("/auth/refresh", {
            method: "POST",
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          store.storeSession(session);
          return session.access_token;
        } catch (error) {
          // Falha de rede não encerra a sessão; só a rejeição do servidor.
          if (error instanceof ApiError && [400, 401, 403].includes(error.status)) {
            store.clearSession();
            if (notify) onSessionExpired();
          }
          throw error;
        }
      })().finally(() => {
        refreshInFlight = null;
      });
      return refreshInFlight;
    },
  };
  return store;
}

/**
 * `auth` é o bearer inicial (string) ou `true` para exigir autenticação usando só o access
 * token em memória (a chamada sem token cai no 401 e passa pelo refresh).
 */
export type Auth = string | true | undefined;

export function createRequester(tokens: TokenStore) {
  async function withRefresh<R>(
    path: string,
    auth: Auth,
    call: (bearer: string | undefined) => Promise<R>,
  ): Promise<R> {
    const authenticated = Boolean(auth);
    const initial = typeof auth === "string" ? auth : undefined;
    const bearerUsed = authenticated ? tokens.getAccessToken() || initial : undefined;
    try {
      return await call(bearerUsed);
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        error.status !== 401 ||
        !authenticated ||
        path.startsWith("/auth/")
      )
        throw error;
      let fresh: string;
      const current = tokens.getAccessToken();
      if (current && current !== bearerUsed) {
        fresh = current; // já houve rotação: só repete com o token atual
      } else {
        try {
          fresh = await tokens.refreshSession();
        } catch {
          throw error;
        }
      }
      try {
        // Mesmo init: corpo e Idempotency-Key idênticos no reenvio.
        return await call(fresh);
      } catch (retryError) {
        if (retryError instanceof ApiError && retryError.status === 401) tokens.expireSession();
        throw retryError;
      }
    }
  }

  return {
    request: <T>(path: string, init: RequestInit = {}, auth?: Auth) =>
      withRefresh(path, auth, (bearer) => send<T>(path, init, bearer)),
    requestPage: <T>(path: string, init: RequestInit = {}, auth?: Auth) =>
      withRefresh(path, auth, (bearer) => sendPage<T>(path, init, bearer)),
  };
}
