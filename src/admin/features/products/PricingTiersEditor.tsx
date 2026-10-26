import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "../../../shared/http";
import { adminApi } from "../../api";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { errorMessage } from "../../ui/errors";
import { useToast } from "../../ui/Toast";
import { formatBRL } from "./format";
import { normalizePrice, priceField } from "./price";

type Tier = { id: string; min_quantity: number; unit_price: string };

const schema = z.object({
  min_quantity: z
    .string()
    .refine(
      (v) => /^\d+$/.test(v.trim()) && Number(v) >= 1,
      "Informe um número inteiro maior que zero.",
    ),
  unit_price: priceField,
});
type Values = z.infer<typeof schema>;

type Props = {
  /** `null` = nova faixa. */
  tier: Tier | null;
  productId: string;
  tiers: Tier[];
  onDone(): void;
};

function TierForm({ tier, productId, tiers, onDone }: Props) {
  const quantityId = useId();
  const priceId = useId();
  const queryClient = useQueryClient();
  const toast = useToast();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      min_quantity: tier ? String(tier.min_quantity) : "",
      unit_price: tier ? tier.unit_price.replace(".", ",") : "",
    },
  });
  const save = useMutation({
    mutationFn: (input: { min_quantity: number; unit_price: string }) =>
      tier
        ? adminApi.updatePricingTier(tier.id, input)
        : adminApi.createPricingTier({ product_id: productId, ...input }),
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    const min_quantity = Number(values.min_quantity);
    const unit_price = normalizePrice(values.unit_price);
    if (!unit_price) return;
    if (tiers.some((t) => t.id !== tier?.id && t.min_quantity === min_quantity)) {
      form.setError("min_quantity", {
        type: "duplicate",
        message: "Já existe uma faixa com essa quantidade mínima.",
      });
      return;
    }
    try {
      await save.mutateAsync({ min_quantity, unit_price });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        form.setError("min_quantity", { type: "server", message: e.message });
      } else if (e instanceof ApiError && e.status === 422 && e.errors.length) {
        for (const x of e.errors) {
          const field = x.loc.includes("unit_price") ? "unit_price" : "min_quantity";
          form.setError(field, { type: "server", message: x.msg });
        }
      } else toast.push("error", errorMessage(e));
      return;
    }
    toast.push("success", tier ? "Faixa de preço atualizada." : "Faixa de preço criada.");
    onDone();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
    ]);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="adm-inline-form">
      <div className="adm-field">
        <label htmlFor={quantityId}>Quantidade mínima</label>
        <input
          id={quantityId}
          type="text"
          inputMode="numeric"
          aria-invalid={!!errors.min_quantity}
          aria-describedby={errors.min_quantity ? `${quantityId}-error` : undefined}
          {...form.register("min_quantity")}
        />
        {errors.min_quantity && (
          <p id={`${quantityId}-error`} className="adm-field-error" role="alert">
            {errors.min_quantity.message}
          </p>
        )}
      </div>
      <div className="adm-field">
        <label htmlFor={priceId}>Preço unitário</label>
        <input
          id={priceId}
          type="text"
          inputMode="decimal"
          aria-invalid={!!errors.unit_price}
          aria-describedby={errors.unit_price ? `${priceId}-error` : undefined}
          {...form.register("unit_price")}
        />
        {errors.unit_price && (
          <p id={`${priceId}-error`} className="adm-field-error" role="alert">
            {errors.unit_price.message}
          </p>
        )}
      </div>
      <button type="submit" className="adm-btn adm-btn-primary" disabled={save.isPending}>
        {save.isPending ? "Salvando…" : "Salvar faixa"}
      </button>
      <button type="button" className="adm-btn" disabled={save.isPending} onClick={onDone}>
        Cancelar
      </button>
    </form>
  );
}

export function PricingTiersEditor({ productId, tiers }: { productId: string; tiers: Tier[] }) {
  // "new" = formulário de criação; id = edição dessa faixa.
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [removing, setRemoving] = useState<Tier | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const remove = useMutation({ mutationFn: (id: string) => adminApi.deletePricingTier(id) });
  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);

  const confirmRemove = async () => {
    if (!removing) return;
    try {
      await remove.mutateAsync(removing.id);
    } catch (e) {
      toast.push("error", errorMessage(e));
      setRemoving(null);
      return;
    }
    setRemoving(null);
    toast.push("success", "Faixa de preço removida.");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
    ]);
  };

  return (
    <section className="adm-card" aria-labelledby="price-tiers">
      <h2 id="price-tiers">Faixas de preço</h2>
      {sorted.length === 0 && editing !== "new" && <p>Sem faixas de preço.</p>}
      <ul className="adm-list">
        {sorted.map((t) => (
          <li key={t.id}>
            {editing === t.id ? (
              <TierForm
                tier={t}
                productId={productId}
                tiers={tiers}
                onDone={() => setEditing(null)}
              />
            ) : (
              <>
                A partir de {t.min_quantity} un.: {formatBRL(t.unit_price)}{" "}
                <button
                  type="button"
                  className="adm-btn"
                  aria-label={`Editar faixa de ${t.min_quantity} un.`}
                  onClick={() => setEditing(t.id)}
                >
                  Editar
                </button>{" "}
                <button
                  type="button"
                  className="adm-btn adm-btn-danger"
                  aria-label={`Remover faixa de ${t.min_quantity} un.`}
                  onClick={() => setRemoving(t)}
                >
                  Remover
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" ? (
        <TierForm tier={null} productId={productId} tiers={tiers} onDone={() => setEditing(null)} />
      ) : (
        <button type="button" className="adm-btn" onClick={() => setEditing("new")}>
          Adicionar faixa
        </button>
      )}
      <ConfirmDialog
        open={removing !== null}
        title="Remover faixa de preço?"
        message={
          removing
            ? `A faixa a partir de ${removing.min_quantity} un. (${formatBRL(removing.unit_price)}) deixará de valer na loja.`
            : ""
        }
        confirmLabel="Remover"
        tone="danger"
        busy={remove.isPending}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoving(null)}
      />
    </section>
  );
}
