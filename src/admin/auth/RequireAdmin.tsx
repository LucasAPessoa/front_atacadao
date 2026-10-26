import { Navigate, Outlet, useLocation } from "react-router";
import { Skeleton } from "../ui/Skeleton";
import { type AuthStatus, useAuth } from "./AuthProvider";

/** returnTo só aceita caminhos internos do portal. */
export function safeReturnTo(value: string | null | undefined): string {
  return value?.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : "/";
}

export type Guard = { kind: "wait" } | { kind: "allow" } | { kind: "redirect"; to: string };

/** Decisão do guard: espera a restauração antes de qualquer redirecionamento (sem flash). */
export function guardDecision(status: AuthStatus, location: string): Guard {
  if (status === "restoring") return { kind: "wait" };
  if (status === "authenticated") return { kind: "allow" };
  return { kind: "redirect", to: `/login?returnTo=${encodeURIComponent(location)}` };
}

export function RequireAdmin() {
  const { status } = useAuth();
  const location = useLocation();
  const decision = guardDecision(status, location.pathname + location.search);
  if (decision.kind === "wait")
    return (
      <div className="adm-restoring" role="status" aria-label="Restaurando sessão">
        <Skeleton height="2rem" width="40%" />
        <Skeleton height="12rem" />
      </div>
    );
  if (decision.kind === "redirect") return <Navigate to={decision.to} replace />;
  return <Outlet />;
}
