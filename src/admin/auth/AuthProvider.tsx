import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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

export type AuthStatus = "restoring" | "authenticated" | "anonymous";
type AuthState = { status: AuthStatus; user: User | null; notice: string };

type AuthContextValue = AuthState & {
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  clearNotice(): void;
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
      } catch {
        if (!alive) return;
        adminTokens.clearSession();
        setState({ status: "anonymous", user: null, notice: "" });
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

  const clearNotice = useCallback(() => setState((s) => ({ ...s, notice: "" })), []);

  const value = useMemo(
    () => ({ ...state, signIn, signOut, clearNotice }),
    [state, signIn, signOut, clearNotice],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
