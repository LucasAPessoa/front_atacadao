import { FormEvent, ReactNode, useState } from "react";
import { navigate } from "../../components/Layout";
import { ApiError, api, Registration } from "../../services/client";

type LoginPageProps = {
  notice?: string;
  onLogin(email: string, password: string): Promise<void>;
};

export function LoginPage({ notice, onLogin }: LoginPageProps) {
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setErrorMessage("");

    try {
      await onLogin(String(form.get("email")), String(form.get("password")));
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError && error.status === 401
          ? "Confira seu e-mail e senha."
          : "Não foi possível entrar agora. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Entre na sua conta"
      description="Acompanhe pedidos, endereços e compras salvas."
    >
      <form onSubmit={submit}>
        <label>
          E-mail
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Senha
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="primary wide" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
      {(notice || errorMessage) && <p className="auth-message" role="status">{errorMessage || notice}</p>}
      <p className="auth-link">
        Ainda não tem conta? <button onClick={() => navigate("/cadastro")}>Cadastre-se</button>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const [type, setType] = useState<Registration["user_type"]>("INDIVIDUAL");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Registration = {
      email: String(form.get("email")),
      password: String(form.get("password")),
      full_name: String(form.get("full_name") || ""),
      user_type: type,
    };

    if (type === "INDIVIDUAL") {
      payload.cpf = String(form.get("cpf"));
    } else {
      payload.cnpj = String(form.get("cnpj"));
      payload.corporate_name = String(form.get("corporate_name"));
      payload.ie = String(form.get("ie") || "");
    }

    setBusy(true);
    setErrorMessage("");
    try {
      await api.register(payload);
      navigate("/entrar?cadastro=concluido");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Não foi possível concluir seu cadastro.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Crie sua conta"
      description="Informe os dados necessários para comprar e receber seu pedido."
    >
      <form onSubmit={submit}>
        <fieldset className="person-type">
          <legend>Tipo de compra</legend>
          <label>
            <input
              type="radio"
              name="user_type"
              checked={type === "INDIVIDUAL"}
              onChange={() => setType("INDIVIDUAL")}
            />
            Pessoa física
          </label>
          <label>
            <input
              type="radio"
              name="user_type"
              checked={type === "COMPANY"}
              onChange={() => setType("COMPANY")}
            />
            Empresa
          </label>
        </fieldset>
        <label>
          {type === "COMPANY" ? "Nome do responsável" : "Nome completo"}
          <input name="full_name" autoComplete="name" required />
        </label>
        <label>
          E-mail
          <input name="email" type="email" autoComplete="email" required />
        </label>
        {type === "INDIVIDUAL" ? (
          <label>
            CPF
            <input name="cpf" inputMode="numeric" autoComplete="off" required />
          </label>
        ) : (
          <>
            <label>
              Razão social
              <input name="corporate_name" autoComplete="organization" required />
            </label>
            <label>
              CNPJ
              <input name="cnpj" inputMode="numeric" autoComplete="off" required />
            </label>
            <label>
              Inscrição estadual <span>(opcional)</span>
              <input name="ie" />
            </label>
          </>
        )}
        <label>
          Senha
          <input name="password" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <button className="primary wide" disabled={busy}>
          {busy ? "Criando conta…" : "Criar conta"}
        </button>
      </form>
      {errorMessage && <p className="auth-message" role="alert">{errorMessage}</p>}
      <p className="auth-link">
        Já tem conta? <button onClick={() => navigate("/entrar")}>Entrar</button>
      </p>
    </AuthShell>
  );
}

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <section className="auth-page" aria-labelledby="auth-title">
      <div className="auth-card">
        <p className="eyebrow">SUA CONTA</p>
        <h1 id="auth-title">{title}</h1>
        <p>{description}</p>
        {children}
      </div>
    </section>
  );
}
