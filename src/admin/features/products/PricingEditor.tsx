import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import { formatVariationName } from "../../../shared/variation";
import { ApiError } from "../../../shared/http";
import { adminApi } from "../../api";
import type { AdminProductDetail, AdminVariant, PricingTableInput } from "../../api/types";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { errorMessage } from "../../ui/errors";
import { useToast } from "../../ui/Toast";
import { formatBRL } from "./format";
import {
  type TierDraft,
  currentUnitPrice,
  noPriceInstruction,
  noPriceSourceLabel,
  priceSourceLabels,
  pricingStatusLabels,
  validatePricing,
  warningText,
} from "./pricing";

const toText = (price: string | null) => (price ?? "").replace(".", ",");
const draftsOf = (variant: AdminVariant): TierDraft[] =>
  variant.pricing_tiers
    .filter((tier) => tier.min_quantity > 1)
    .map((tier) => ({
      key: tier.id,
      min: String(tier.min_quantity),
      price: toText(tier.unit_price),
    }));

/** Mensagens do back (422, 409, 502) aparecem como vieram; o resto usa o texto padrão do portal. */
const serverMessage = (error: unknown) => {
  if (!(error instanceof ApiError) || ![409, 422, 502].includes(error.status))
    return errorMessage(error);
  // 422 do pydantic traz `detail` em lista: as mensagens ficam em `errors`.
  return error.errors.length ? error.errors.map((e) => e.msg).join(" ") : error.message;
};

export function VariantPricingEditor({
  productId,
  variant,
}: {
  productId: string;
  variant: AdminVariant;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const uid = useId();
  const initialUnit = toText(currentUnitPrice(variant));
  const [unit, setUnit] = useState(initialUnit);
  const [drafts, setDrafts] = useState<TierDraft[]>(draftsOf(variant));
  const [errors, setErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState("");
  const [pendingInput, setPendingInput] = useState<PricingTableInput | null>(null);
  const [counter, setCounter] = useState(0);

  // Depois de salvar/confirmar, o detalhe recarregado volta a refletir o servidor.
  const signature = JSON.stringify([variant.pricing_tiers, variant.store_price]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reinicia só quando o servidor muda a tabela.
  useEffect(() => {
    setUnit(toText(currentUnitPrice(variant)));
    setDrafts(draftsOf(variant));
  }, [signature]);

  const save = useMutation({
    mutationFn: (input: PricingTableInput) =>
      adminApi.savePricingTable(productId, variant.id, input),
  });

  const submit = async (input: PricingTableInput) => {
    setServerError("");
    try {
      await save.mutateAsync(input);
    } catch (error) {
      setServerError(serverMessage(error));
      return;
    }
    toast.push(
      "success",
      `Tabela de preços de ${formatVariationName(variant.variation_name)} salva e confirmada.`,
    );
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
    ]);
  };

  const before = currentUnitPrice(variant);
  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const check = validatePricing(unit, drafts);
    setErrors(check.errors);
    setServerError("");
    if (!check.input) return;
    // A linha de 1 unidade grava no Bling: pede confirmação quando ela mudou.
    if (check.input.unit_price !== before) setPendingInput(check.input);
    else void submit(check.input);
  };

  const update = (key: string, patch: Partial<TierDraft>) =>
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  return (
    <form
      className="adm-card"
      aria-labelledby={`${uid}-title`}
      onSubmit={onSubmit}
      noValidate
      data-variant={variant.id}
    >
      <h3 id={`${uid}-title`}>{formatVariationName(variant.variation_name)}</h3>
      <p>
        <span
          className="adm-badge"
          data-tone={variant.pricing_status === "pending" ? "warning" : "success"}
        >
          {pricingStatusLabels[variant.pricing_status]}
        </span>{" "}
        <span className="adm-muted">
          {variant.price_source ? priceSourceLabels[variant.price_source] : noPriceSourceLabel}
        </span>
        {!variant.published && <span className="adm-muted"> · Fora da loja do site</span>}
      </p>
      {variant.pricing_status === "pending" && currentUnitPrice(variant) === null && (
        <p className="adm-alert adm-alert-warning" role="status">
          {noPriceInstruction}
        </p>
      )}
      {variant.warnings.length > 0 && (
        <ul className="adm-alert adm-alert-warning" aria-label="Avisos">
          {variant.warnings.map((w) => (
            <li key={w}>{warningText(w)}</li>
          ))}
        </ul>
      )}
      <div className="adm-field">
        <label htmlFor={`${uid}-unit`}>Preço de 1 unidade (R$)</label>
        <input
          id={`${uid}-unit`}
          type="text"
          inputMode="decimal"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
        <small className="adm-muted">
          Atual: {formatBRL(currentUnitPrice(variant))}. Alterar grava no Bling (loja do site).
        </small>
      </div>
      <fieldset className="adm-field">
        <legend>Faixas por quantidade</legend>
        {drafts.length === 0 && (
          <p className="adm-muted">Nenhuma faixa: vale só o preço de 1 unidade.</p>
        )}
        {drafts.map((d, index) => (
          <fieldset className="adm-tier-row" key={d.key}>
            <legend>Faixa {index + 1}</legend>
            <div className="adm-field">
              <label htmlFor={`${uid}-min-${d.key}`}>A partir de (un.)</label>
              <input
                id={`${uid}-min-${d.key}`}
                type="text"
                inputMode="numeric"
                value={d.min}
                onChange={(e) => update(d.key, { min: e.target.value })}
              />
            </div>
            <div className="adm-field">
              <label htmlFor={`${uid}-price-${d.key}`}>Preço (R$)</label>
              <input
                id={`${uid}-price-${d.key}`}
                type="text"
                inputMode="decimal"
                value={d.price}
                onChange={(e) => update(d.key, { price: e.target.value })}
              />
            </div>
            <button
              type="button"
              className="adm-btn"
              aria-label={`Remover faixa ${index + 1}`}
              onClick={() => setDrafts((list) => list.filter((x) => x.key !== d.key))}
            >
              Remover
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          className="adm-btn"
          onClick={() => {
            setCounter(counter + 1);
            setDrafts((list) => [...list, { key: `new-${counter}`, min: "", price: "" }]);
          }}
        >
          Adicionar faixa
        </button>
      </fieldset>
      {errors.length > 0 && (
        <ul className="adm-field-error" role="alert">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      {serverError && (
        <p className="adm-alert adm-alert-danger" role="alert">
          {serverError}
        </p>
      )}
      <div>
        <button type="submit" className="adm-btn" disabled={save.isPending}>
          {save.isPending ? "Salvando…" : "Salvar e confirmar"}
        </button>
      </div>
      <ConfirmDialog
        open={pendingInput !== null}
        title={before === null ? "Definir preço no Bling?" : "Alterar o preço no Bling?"}
        message={`De ${formatBRL(before)} para ${formatBRL(pendingInput?.unit_price ?? null)}. Isso grava o preço de 1 unidade desta variação no Bling (loja do site).`}
        confirmLabel={before === null ? "Definir e salvar" : "Alterar e salvar"}
        busy={save.isPending}
        onCancel={() => setPendingInput(null)}
        onConfirm={() => {
          const input = pendingInput;
          setPendingInput(null);
          if (input) void submit(input);
        }}
      />
    </form>
  );
}

export function PricingTab({ product }: { product: AdminProductDetail }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState("");
  const pending = product.variants.some((v) => v.published && v.pricing_status === "pending");
  const confirm = useMutation({ mutationFn: () => adminApi.confirmProductPricing(product.id) });
  const onConfirm = async () => {
    setError("");
    try {
      await confirm.mutateAsync();
    } catch (e) {
      setError(serverMessage(e));
      return;
    }
    toast.push("success", "Preços confirmados.");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "product", product.id] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
    ]);
  };
  return (
    <div role="tabpanel" aria-label="Preços" className="adm-stack">
      <div className="adm-actions">
        <button
          type="button"
          className="adm-btn adm-btn-primary"
          disabled={!pending || confirm.isPending}
          aria-describedby="adm-confirm-hint"
          onClick={() => void onConfirm()}
        >
          {confirm.isPending ? "Confirmando…" : "Confirmar preços"}
        </button>
        <span className="adm-muted" id="adm-confirm-hint">
          {pending
            ? "Confirma as variações aguardando preços com a tabela atual (sem alterar o Bling)."
            : "Nenhuma variação publicada aguardando confirmação."}
        </span>
      </div>
      {error && (
        <p className="adm-alert adm-alert-danger" role="alert">
          {error}
        </p>
      )}
      {product.variants.length === 0 && <p>Este produto não tem variações.</p>}
      {product.variants.map((variant) => (
        <VariantPricingEditor key={variant.id} productId={product.id} variant={variant} />
      ))}
    </div>
  );
}
