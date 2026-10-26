import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiError } from "../../shared/http";
import { adminApi } from "../api";
import type { User } from "../api/types";
import { adminTokens } from "./session";

export const NOT_ADMIN_MESSAGE = "Esta conta não tem acesso ao painel";
export const SESSION_ENDED_MESSAGE = "Sua sessão foi encerrada. Entre novamente para continuar.";

export class NotAdminError extends Error {
  constructor() {
    super(NOT_ADMIN_MESSAGE);
  }
}

/**
 * Login do portal: POST /auth/login e GET /users/me com o token recém-emitido. Se o papel não for
 * admin, revoga o refresh (POST /auth/logout) e nada é gravado: a sessão só abre para admin.
 */
export async function authenticate(email: string, password: string): Promise<User> {
  const session = await adminApi.login(email, password);
  const user = await adminApi.meWith(session.access_token);
  if (user.role.name !== "admin") {
    await adminApi.logoutWith(session.access_token, session.refresh_token).catch(() => undefined);
    throw new NotAdminError();
  }
  adminTokens.storeSession(session);
  return user;
}

export type AuthStatus = "restoring" | "authenticated" | "anonymous" | "error";

/** Só rejeição do servidor (400/401/403) ou papel errado invalida a sessão; rede/5xx preserva. */
export const invalidatesSession = (error: unknown) =>
  error instanceof NotAdminError ||
  (error instanceof ApiError && [400, 401, 403].includes(error.status));
type AuthState = { status: AuthStatus; user: User | null; notice: string };

type AuthContextValue = AuthState & {
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  clearNotice(): void;
  /** Nova tentativa de restaurar a sessão após falha de rede/5xx. */
  retryRestore(): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth fora do AuthProvider");
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    status: adminTokens.hasStoredSession() ? "restoring" : "anonymous",
    user: null,
    notice: "",
  }));

  useEffect(() => {
    adminTokens.setOnSessionExpired(() =>
      setState({ status: "anonymous", user: null, notice: SESSION_ENDED_MESSAGE }),
    );
  }, []);

  useEffect(() => {
    if (state.status !== "restoring") return;
    let alive = true;
    (async () => {
      try {
        await adminTokens.refreshSession(false);
        const user = await adminApi.me();
        if (!alive) return;
        if (user.role.name !== "admin") throw new NotAdminError();
        setState({ status: "authenticated", user, notice: "" });
      } catch (error) {
        if (!alive) return;
        if (invalidatesSession(error)) {
          adminTokens.clearSession();
          setState({ status: "anonymous", user: null, notice: "" });
        } else setState({ status: "error", user: null, notice: "" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [state.status]);

  const signIn = useCallback(async (email: string, password: string) => {
    const user = await authenticate(email, password);
    setState({ status: "authenticated", user, notice: "" });
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = adminTokens.getRefreshToken();
    const access = adminTokens.getAccessToken();
    adminTokens.clearSession();
    setState({ status: "anonymous", user: null, notice: "" });
    if (access && refreshToken)
      await adminApi.logoutWith(access, refreshToken).catch(() => {
        /* a sessão local já foi encerrada */
      });
  }, []);

  const retryRestore = useCallback(
    () => setState({ status: "restoring", user: null, notice: "" }),
    [],
  );

  const clearNotice = useCallback(() => setState((s) => ({ ...s, notice: "" })), []);

  const value = useMemo(
    () => ({ ...state, signIn, signOut, clearNotice, retryRestore }),
    [state, signIn, signOut, clearNotice, retryRestore],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
