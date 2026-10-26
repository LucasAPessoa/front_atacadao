import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { z } from "zod";
import { ApiError } from "../../shared/http";
import { store } from "../../shared/store-config";
import { NotAdminError, useAuth } from "./AuthProvider";
import { safeReturnTo } from "./RequireAdmin";

const schema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});
type Values = z.infer<typeof schema>;

export function loginErrorMessage(error: unknown): string {
  if (error instanceof NotAdminError) return error.message;
  if (error instanceof ApiError) {
    if (error.status === 401) return "E-mail ou senha incorretos.";
    if (error.status === 429)
      return error.retryAfter
        ? `Muitas tentativas. Tente novamente em ${error.retryAfter} s.`
        : "Muitas tentativas. Aguarde um instante e tente novamente.";
    return error.message;
  }
  return "Não foi possível falar com o servidor agora. Tente novamente.";
}

export function Component() {
  const { signIn, notice, clearNotice, status } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async (values) => {
    setError("");
    clearNotice();
    try {
      await signIn(values.email, values.password);
      navigate(safeReturnTo(params.get("returnTo")), { replace: true });
    } catch (e) {
      setError(loginErrorMessage(e));
    }
  });

  if (status === "authenticated")
    return <Navigate to={safeReturnTo(params.get("returnTo"))} replace />;

  return (
    <main className="adm-login">
      <form className="adm-card adm-login-card" onSubmit={submit} noValidate>
        <h1>Painel — {store.name}</h1>
        {notice && (
          <p className="adm-alert adm-alert-warning" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="adm-alert adm-alert-danger" role="alert">
            {error}
          </p>
        )}
        <div className="adm-field">
          <label htmlFor="adm-email">E-mail</label>
          <input
            id="adm-email"
            type="email"
            autoComplete="username"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "adm-email-error" : undefined}
            {...form.register("email")}
          />
          {errors.email && (
            <p id="adm-email-error" className="adm-field-error">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="adm-field">
          <label htmlFor="adm-password">Senha</label>
          <input
            id="adm-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "adm-password-error" : undefined}
            {...form.register("password")}
          />
          {errors.password && (
            <p id="adm-password-error" className="adm-field-error">
              {errors.password.message}
            </p>
          )}
        </div>
        <button type="submit" className="adm-btn adm-btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
