import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { adminApi } from "../../api";
import type { AdminProductDetail, PresentationPatch } from "../../api/types";
import { errorMessage } from "../../ui/errors";
import { useToast } from "../../ui/Toast";

/** Só as chaves alteradas em relação ao que o servidor devolveu. */
export function buildPatch(
  values: { visible: boolean; featured: boolean },
  initial: { visible: boolean; featured: boolean },
): PresentationPatch {
  const patch: PresentationPatch = {};
  if (values.visible !== initial.visible) patch.visible = values.visible;
  if (values.featured !== initial.featured) patch.featured = values.featured;
  return patch;
}

/** Apresentação na loja: só visibilidade e destaque. O resto vem do Bling. */
export function PresentationForm({ product }: { product: AdminProductDetail }) {
  const { visible, featured } = product.presentation;
  const queryClient = useQueryClient();
  const toast = useToast();
  const [values, setValues] = useState({ visible, featured });
  // Depois de salvar, o detalhe é recarregado: o formulário volta a refletir o servidor.
  useEffect(() => setValues({ visible, featured }), [visible, featured]);

  const save = useMutation({
    mutationFn: (patch: PresentationPatch) => adminApi.updatePresentation(product.id, patch),
  });

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const patch = buildPatch(values, { visible, featured });
    if (Object.keys(patch).length === 0) {
      toast.push("info", "Nenhuma alteração para salvar.");
      return;
    }
    try {
      await save.mutateAsync(patch);
    } catch (error) {
      toast.push("error", errorMessage(error));
      return;
    }
    toast.push("success", "Apresentação na loja salva.");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "product", product.id] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
    ]);
  };

  return (
    <form role="tabpanel" aria-label="Loja" className="adm-stack" onSubmit={onSubmit}>
      <p className="adm-muted">
        Nome, descrição, imagens e categorias vêm do Bling. Edite no Bling.
      </p>
      <fieldset className="adm-card">
        <legend>Exibição</legend>
        <label className="adm-switch">
          <input
            type="checkbox"
            checked={values.visible}
            onChange={(e) => setValues({ ...values, visible: e.target.checked })}
          />
          Visível na loja
        </label>
        <label className="adm-switch">
          <input
            type="checkbox"
            checked={values.featured}
            onChange={(e) => setValues({ ...values, featured: e.target.checked })}
          />
          Destaque
        </label>
      </fieldset>
      <div>
        <button type="submit" className="adm-btn adm-btn-primary" disabled={save.isPending}>
          {save.isPending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
