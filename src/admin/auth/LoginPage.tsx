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
    if (error.status === 401)
      return "E-mail ou senha incorretos. Confira os dados e tente novamente.";
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
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="adm-login-col">
        <header className="adm-login-head">
          <span className="adm-login-store">{store.name}</span>
          <h1>Entrar no painel</h1>
          <p>Acesso para o lojista e a equipe da loja.</p>
        </header>
        <form className="adm-card adm-login-card" onSubmit={submit} noValidate>
          {notice && (
            <p className="adm-alert adm-alert-warning" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className="adm-alert adm-alert-danger adm-login-error" role="alert">
              <svg
                aria-hidden="true"
                focusable="false"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v6M12 16.5v.5" />
              </svg>
              <span>{error}</span>
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
            <div className="adm-password">
              <input
                id="adm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "adm-password-error" : undefined}
                {...form.register("password")}
              />
              <button
                type="button"
                className="adm-password-toggle"
                aria-controls="adm-password"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((shown) => !shown)}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
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
        <p className="adm-login-help">
          Sem acesso ou esqueceu a senha? Fale com quem administra a loja.
        </p>
      </div>
    </main>
  );
}
