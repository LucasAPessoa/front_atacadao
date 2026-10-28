import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { store } from "../../../shared/store-config";
import { brandTokens, contrastRatio } from "../../../shared/theme";
import { adminApi } from "../../api";
import type { StoreThemeSettings, ThemeOption } from "../../api/types";
import { ErrorState } from "../../ui/ErrorState";
import { SkeletonRows } from "../../ui/Skeleton";
import { errorMessage } from "../../ui/errors";

export const MIN_CONTRAST = 4.5;
export const themeSettingsKey = ["store", "theme"] as const;
const themesKey = ["store", "themes"] as const;
const HEX = /^#[0-9a-fA-F]{6}$/;

export const isHex = (value: string) => HEX.test(value.trim());

type ViewProps = {
  themes: ThemeOption[];
  theme: string;
  savedTheme: string;
  color: string;
  saving: boolean;
  error: string;
  saved: boolean;
  onTheme(key: string): void;
  onColor(value: string): void;
  onSave(): void;
  onRestore(): void;
};

export function AppearanceView(p: ViewProps) {
  const valid = isHex(p.color);
  const effective = valid ? p.color.trim() : store.theme.brand;
  const tokens = brandTokens(effective);
  const ratio = contrastRatio(tokens.brand, tokens.onBrand);
  const saveable = valid || p.color.trim() === "";
  const low = valid && ratio < MIN_CONTRAST;
  return (
    <>
      <div className="adm-page-header">
        <h1>Aparência</h1>
      </div>
      <form
        className="adm-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (saveable) p.onSave();
        }}
      >
        <fieldset className="adm-theme-list">
          <legend>Tema da loja</legend>
          {p.themes.map((option) => (
            <label
              key={option.key}
              className="adm-theme-card"
              data-selected={p.theme === option.key}
            >
              <input
                type="radio"
                name="tema"
                value={option.key}
                checked={p.theme === option.key}
                onChange={() => p.onTheme(option.key)}
              />
              <strong>{option.name}</strong>
              {p.savedTheme === option.key && <span className="adm-badge">Atual</span>}
              {p.theme === option.key && p.savedTheme !== option.key && (
                <span className="adm-badge">Selecionado</span>
              )}
              <span>{option.description}</span>
            </label>
          ))}
        </fieldset>

        <div className="adm-field">
          <label htmlFor="cor-marca-hex">Cor da marca (hex)</label>
          <div className="adm-color-row">
            <input
              type="color"
              aria-label="Seletor de cor da marca"
              value={valid ? p.color.trim().toLowerCase() : effective.toLowerCase()}
              onChange={(event) => p.onColor(event.target.value)}
            />
            <input
              id="cor-marca-hex"
              type="text"
              value={p.color}
              placeholder={store.theme.brand}
              maxLength={7}
              aria-invalid={p.color !== "" && !valid}
              aria-describedby={
                p.color !== "" && !valid ? "cor-marca-ajuda cor-marca-erro" : "cor-marca-ajuda"
              }
              onChange={(event) => p.onColor(event.target.value)}
            />
          </div>
          <small id="cor-marca-ajuda">
            Formato #RRGGBB. Vazio usa a cor padrão da loja ({store.theme.brand}).
          </small>
          {p.color !== "" && !valid && (
            <p id="cor-marca-erro" className="adm-field-error" role="alert">
              Use o formato #RRGGBB, por exemplo #1D6B57. Mostrando a cor padrão.
            </p>
          )}
        </div>

        <div className="adm-field">
          <span>Prévia do botão</span>
          <div>
            <span
              aria-hidden="true"
              className="adm-theme-preview"
              style={{ background: tokens.brand, color: tokens.onBrand }}
            >
              Comprar
            </span>{" "}
            <small>Contraste {ratio.toFixed(1)}:1</small>
          </div>
          {low && (
            <p className="adm-alert adm-alert-warning" role="status">
              Contraste {ratio.toFixed(1)}:1, abaixo do mínimo recomendado de 4,5:1. O texto do
              botão pode ficar difícil de ler; prefira uma cor mais clara ou mais escura.
            </p>
          )}
        </div>

        {p.error && (
          <p className="adm-alert adm-alert-danger" role="alert">
            {p.error}
          </p>
        )}
        {p.saved && !p.error && (
          <p className="adm-alert adm-alert-success" role="status">
            Aparência salva. A loja já usa as novas configurações.
          </p>
        )}
        <div className="adm-actions">
          <button
            type="submit"
            className="adm-btn adm-btn-primary"
            disabled={p.saving || !saveable}
          >
            {p.saving ? "Salvando…" : "Salvar"}
          </button>
          <button type="button" className="adm-btn" disabled={p.saving} onClick={p.onRestore}>
            Restaurar cor padrão
          </button>
        </div>
      </form>
    </>
  );
}

function AppearanceForm({
  themes,
  settings,
}: {
  themes: ThemeOption[];
  settings: StoreThemeSettings;
}) {
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState(settings.theme);
  const [color, setColor] = useState(settings.brand_color ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: (body: { theme: string; brand_color: string | null }) =>
      adminApi.updateStoreTheme(body),
    onSuccess: (next) => {
      queryClient.setQueryData(themeSettingsKey, next);
      setTheme(next.theme);
      setColor(next.brand_color ?? "");
      setSaved(true);
    },
  });
  const run = (brand: string | null) => {
    setError("");
    setSaved(false);
    mutation.mutate({ theme, brand_color: brand }, { onError: (e) => setError(errorMessage(e)) });
  };
  return (
    <AppearanceView
      themes={themes}
      theme={theme}
      savedTheme={settings.theme}
      color={color}
      saving={mutation.isPending}
      error={error}
      saved={saved}
      onTheme={(key) => {
        setTheme(key);
        setSaved(false);
      }}
      onColor={(value) => {
        setColor(value);
        setSaved(false);
      }}
      onSave={() => run(color.trim() === "" ? null : color.trim().toUpperCase())}
      onRestore={() => {
        setColor("");
        setSaved(false);
      }}
    />
  );
}

export function AppearancePage() {
  const themes = useQuery({
    queryKey: themesKey,
    queryFn: ({ signal }) => adminApi.getThemes(signal),
  });
  const settings = useQuery({
    queryKey: themeSettingsKey,
    queryFn: ({ signal }) => adminApi.getStoreTheme(signal),
  });
  if (themes.isPending || settings.isPending)
    return (
      <>
        <div className="adm-page-header">
          <h1>Aparência</h1>
        </div>
        <SkeletonRows rows={3} />
      </>
    );
  if (themes.isError || settings.isError)
    return (
      <ErrorState
        error={themes.error ?? settings.error}
        onRetry={() => {
          void themes.refetch();
          void settings.refetch();
        }}
      />
    );
  return <AppearanceForm themes={themes.data} settings={settings.data} />;
}
