import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "../../../shared/http";
import { adminApi } from "../../api";
import type { AdminVariant } from "../../api/types";
import { errorMessage } from "../../ui/errors";
import { useToast } from "../../ui/Toast";
import { formatBRL } from "./format";
import { normalizePrice, priceField } from "./price";

const schema = z.object({ price: priceField });
type Values = z.infer<typeof schema>;

function VariantPriceRow({ variant, productId }: { variant: AdminVariant; productId: string }) {
  const [editing, setEditing] = useState(false);
  const inputId = useId();
  const queryClient = useQueryClient();
  const toast = useToast();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { price: variant.base_price.replace(".", ",") },
  });
  const save = useMutation({
    mutationFn: (price: string) => adminApi.updateVariantPrice(variant.id, price),
  });
  const error = form.formState.errors.price?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    const price = normalizePrice(values.price);
    if (!price) return;
    if (price === variant.base_price) {
      setEditing(false);
      return;
    }
    try {
      await save.mutateAsync(price);
    } catch (e) {
      if (e instanceof ApiError && e.status === 422 && e.errors.length) {
        form.setError("price", { type: "server", message: e.errors.map((x) => x.msg).join(" ") });
      } else toast.push("error", errorMessage(e));
      return;
    }
    toast.push("success", "Preço da variação salvo.");
    setEditing(false);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "product", productId] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
    ]);
  });

  return (
    <tr>
      <td>
        {variant.variation_name}
        <div className="adm-muted">SKU {variant.bling_sku}</div>
      </td>
      <td className="adm-num">
        {editing ? (
          <form onSubmit={onSubmit} noValidate className="adm-inline-form">
            <div className="adm-field">
              <label htmlFor={inputId} className="adm-sr-only">
                Preço no site de {variant.variation_name}
              </label>
              <input
                id={inputId}
                type="text"
                inputMode="decimal"
                aria-invalid={!!error}
                aria-describedby={error ? `${inputId}-error` : undefined}
                {...form.register("price")}
              />
              {error && (
                <p id={`${inputId}-error`} className="adm-field-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              className="adm-btn"
              disabled={save.isPending}
              onClick={() => {
                form.reset({ price: variant.base_price.replace(".", ",") });
                setEditing(false);
              }}
            >
              Cancelar
            </button>
          </form>
        ) : (
          <>
            {formatBRL(variant.base_price)}{" "}
            <button
              type="button"
              className="adm-btn"
              aria-label={`Editar preço de ${variant.variation_name}`}
              onClick={() => {
                form.reset({ price: variant.base_price.replace(".", ",") });
                setEditing(true);
              }}
            >
              Editar
            </button>
          </>
        )}
      </td>
    </tr>
  );
}

export function VariantPriceEditor({
  productId,
  variants,
}: {
  productId: string;
  variants: AdminVariant[];
}) {
  return (
    <section className="adm-card" aria-labelledby="price-variants">
      <h2 id="price-variants">Preço por variação</h2>
      {variants.length === 0 ? (
        <p>Sem variações.</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <caption className="adm-sr-only">Preço por variação</caption>
            <thead>
              <tr>
                <th scope="col">Variação</th>
                <th scope="col" className="adm-num">
                  Preço no site
                </th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <VariantPriceRow key={v.id} variant={v} productId={productId} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
