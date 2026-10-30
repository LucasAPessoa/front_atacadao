import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PricingSettings } from "../../api/types";
import { adminApi } from "../../api";
import { ErrorState } from "../../ui/ErrorState";
import { SkeletonRows } from "../../ui/Skeleton";
import { errorMessage } from "../../ui/errors";
import { useToast } from "../../ui/Toast";

export const pricingSettingsKey = ["admin", "pricing-settings"] as const;

type ViewProps = {
  settings: PricingSettings;
  saving: boolean;
  error: string;
  onToggle(value: boolean): void;
};

export function PricingSettingsView({ settings, saving, error, onToggle }: ViewProps) {
  return (
    <>
      <div className="adm-page-header">
        <h1 id="adm-page-title">Configurações de preços</h1>
      </div>
      <div className="adm-card">
        <label className="adm-switch">
          <input
            type="checkbox"
            aria-describedby="adm-auto-confirm-hint"
            checked={settings.auto_confirm}
            disabled={saving}
            onChange={(e) => onToggle(e.target.checked)}
          />
          Confirmação automática de preços
        </label>
        <p className="adm-muted" id="adm-auto-confirm-hint">
          Ligada: variações novas entram na loja já com a tabela atual. Desligada: ficam aguardando
          preços até você confirmar. Vale para produtos importados a partir de agora; os já
          pendentes continuam pendentes.
        </p>
        {error && (
          <p className="adm-alert adm-alert-danger" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="adm-card">
        <h2>Loja do site no Bling</h2>
        {settings.store_configured ? (
          <p>
            <span className="adm-badge" data-tone="success">
              Configurada
            </span>{" "}
            ID da loja: {settings.store_id}
          </p>
        ) : (
          <p className="adm-alert adm-alert-warning" role="status">
            <span className="adm-badge" data-tone="warning">
              Não configurada
            </span>{" "}
            A loja do site no Bling ainda não foi configurada neste ambiente. Os preços da loja não
            podem ser lidos nem alterados.
          </p>
        )}
      </div>
    </>
  );
}

export function PricingSettingsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const query = useQuery({
    queryKey: pricingSettingsKey,
    queryFn: ({ signal }) => adminApi.getPricingSettings(signal),
  });
  const save = useMutation({
    mutationFn: (auto_confirm: boolean) => adminApi.updatePricingSettings({ auto_confirm }),
    onSuccess: (next) => {
      queryClient.setQueryData(pricingSettingsKey, next);
      toast.push("success", "Configuração salva.");
    },
  });
  if (query.isPending) return <SkeletonRows />;
  if (query.error || !query.data)
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return (
    <PricingSettingsView
      settings={query.data}
      saving={save.isPending}
      error={save.error ? errorMessage(save.error) : ""}
      onToggle={(value) => save.mutate(value)}
    />
  );
}
