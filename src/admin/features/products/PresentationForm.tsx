import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { type FieldPath, FormProvider, useForm, useFormContext } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "../../../shared/http";
import { sanitizeHtml } from "../../../shared/sanitize-html";
import { adminApi } from "../../api";
import type { AdminProductDetail, Presentation, PresentationPatch } from "../../api/types";
import { errorMessage } from "../../ui/errors";
import { useToast } from "../../ui/Toast";

type TextKey = "name" | "description" | "complementary_description";
const TEXT_FIELDS: { key: TextKey; label: string; multiline: boolean }[] = [
  { key: "name", label: "Nome", multiline: false },
  { key: "description", label: "Descrição", multiline: true },
  { key: "complementary_description", label: "Descrição complementar", multiline: true },
];
const CATEGORY_MAX = 20;

const textValue = z.object({ locked: z.boolean(), value: z.string() });
const schema = z
  .object({
    name: textValue,
    description: textValue,
    complementary_description: textValue,
    categories: z.object({ locked: z.boolean(), ids: z.array(z.string()) }),
    visible: z.boolean(),
    featured: z.boolean(),
  })
  .superRefine((form, ctx) => {
    for (const { key, label } of TEXT_FIELDS) {
      const field = form[key];
      if (!field.locked) continue;
      const text = field.value.trim();
      if (!text)
        ctx.addIssue({
          code: "custom",
          path: [key, "value"],
          message: `${label}: informe um valor.`,
        });
      else if (key === "name" && text.length > 255)
        ctx.addIssue({
          code: "custom",
          path: [key, "value"],
          message: "Nome: use no máximo 255 caracteres.",
        });
    }
    if (
      form.categories.locked &&
      (form.categories.ids.length < 1 || form.categories.ids.length > CATEGORY_MAX)
    )
      ctx.addIssue({
        code: "custom",
        path: ["categories", "ids"],
        message: `Escolha de 1 a ${CATEGORY_MAX} categorias.`,
      });
  });
export type PresentationFormValues = z.infer<typeof schema>;

export function toFormValues(p: Presentation): PresentationFormValues {
  const text = (f: Presentation["name"]) => ({
    locked: f.locked,
    value: f.locked ? (f.site ?? "") : (f.bling ?? ""),
  });
  return {
    name: text(p.name),
    description: text(p.description),
    complementary_description: text(p.complementary_description),
    categories: { locked: p.categories.locked, ids: p.categories.site.map((c) => c.id) },
    visible: p.visible,
    featured: p.featured,
  };
}

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** Só as chaves alteradas em relação ao que o servidor devolveu. */
export function buildPatch(
  values: PresentationFormValues,
  initial: PresentationFormValues,
): PresentationPatch {
  const patch: PresentationPatch = {};
  for (const { key } of TEXT_FIELDS) {
    const now = values[key];
    const before = initial[key];
    if (!now.locked) {
      if (before.locked) patch[key] = { locked: false };
    } else if (!before.locked || now.value.trim() !== before.value.trim()) {
      patch[key] = { locked: true, value: now.value.trim() };
    }
  }
  const cats = values.categories;
  const before = initial.categories;
  if (!cats.locked) {
    if (before.locked) patch.categories = { locked: false };
  } else if (!before.locked || !sameIds(cats.ids, before.ids)) {
    patch.categories = { locked: true, category_ids: cats.ids };
  }
  if (values.visible !== initial.visible) patch.visible = values.visible;
  if (values.featured !== initial.featured) patch.featured = values.featured;
  return patch;
}

function BlingValue({ html, value }: { html: boolean; value: string | null }) {
  if (!value) return <span className="adm-muted">—</span>;
  // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML sanitizado por DOMPurify (tags de texto, sem atributos).
  if (html) return <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />;
  return <span>{value}</span>;
}

function TextOverride({
  field,
  blingValue,
}: {
  field: (typeof TEXT_FIELDS)[number];
  blingValue: string | null;
}) {
  const { register, watch, formState } = useFormContext<PresentationFormValues>();
  const { key, label, multiline } = field;
  const locked = watch(`${key}.locked`);
  const error = formState.errors[key]?.value?.message;
  const valueId = `pf-${key}-value`;
  return (
    <fieldset className="adm-card">
      <legend>{label}</legend>
      <label className="adm-switch">
        <input type="checkbox" {...register(`${key}.locked`)} />
        Personalizar no site (desligado: usar do Bling)
      </label>
      <div className="adm-override">
        <div className="adm-override-bling">
          <div className="adm-muted">Valor do Bling (somente leitura)</div>
          <BlingValue html={multiline} value={blingValue} />
        </div>
        {locked && (
          <div className="adm-field">
            <label htmlFor={valueId}>{label} no site</label>
            {multiline ? (
              <textarea
                id={valueId}
                rows={5}
                aria-invalid={!!error}
                aria-describedby={error ? `${valueId}-error` : undefined}
                {...register(`${key}.value`)}
              />
            ) : (
              <input
                id={valueId}
                type="text"
                aria-invalid={!!error}
                aria-describedby={error ? `${valueId}-error` : undefined}
                {...register(`${key}.value`)}
              />
            )}
            {error && (
              <p id={`${valueId}-error`} className="adm-field-error" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </fieldset>
  );
}

function CategoriesOverride({ presentation }: { presentation: Presentation }) {
  const { register, watch, formState } = useFormContext<PresentationFormValues>();
  const locked = watch("categories.locked");
  const selected = watch("categories.ids");
  const error = formState.errors.categories?.ids?.message;
  const catalog = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: ({ signal }) => adminApi.categories(signal),
  });
  // Categorias já gravadas no site entram mesmo se a listagem não as trouxer.
  const options = new Map(
    presentation.categories.site.map((c) => [c.id, { name: c.name, is_active: c.is_active }]),
  );
  for (const c of catalog.data ?? []) options.set(c.id, { name: c.name, is_active: c.is_active });
  const inactive = [...options].filter(([id, c]) => selected.includes(id) && !c.is_active);
  return (
    <fieldset className="adm-card">
      <legend>Categorias</legend>
      <label className="adm-switch">
        <input type="checkbox" {...register("categories.locked")} />
        Personalizar no site (desligado: usar do Bling)
      </label>
      <div className="adm-override">
        <div className="adm-override-bling">
          <div className="adm-muted">Categorias do Bling (somente leitura)</div>
          {presentation.categories.bling.length ? (
            <ul className="adm-list">
              {presentation.categories.bling.map((c) => (
                <li key={c.id}>{c.name}</li>
              ))}
            </ul>
          ) : (
            <span className="adm-muted">—</span>
          )}
        </div>
        {locked && (
          <div className="adm-field">
            <span>Categorias no site (1 a {CATEGORY_MAX})</span>
            {catalog.isPending && <p className="adm-muted">Carregando categorias…</p>}
            {catalog.isError && (
              <p className="adm-field-error" role="alert">
                Não foi possível carregar as categorias. {errorMessage(catalog.error)}{" "}
                <button type="button" className="adm-btn" onClick={() => void catalog.refetch()}>
                  Tentar novamente
                </button>
              </p>
            )}
            <fieldset className="adm-checklist">
              <legend className="adm-sr-only">Categorias disponíveis</legend>
              {[...options].map(([id, c]) => (
                <label key={id}>
                  <input type="checkbox" value={id} {...register("categories.ids")} /> {c.name}
                  {!c.is_active && " (inativa)"}
                </label>
              ))}
            </fieldset>
            {inactive.length > 0 && (
              <p className="adm-alert adm-alert-warning" role="status">
                Categoria inativa não aparece na loja: {inactive.map(([, c]) => c.name).join(", ")}.
              </p>
            )}
            {error && (
              <p className="adm-field-error" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </fieldset>
  );
}

const FIELD_KEYS = [
  "name",
  "description",
  "complementary_description",
  "categories",
  "visible",
  "featured",
] as const;

function target(key: string, loc: unknown[]): FieldPath<PresentationFormValues> | null {
  if (!(FIELD_KEYS as readonly string[]).includes(key)) return null;
  if (key === "categories") return "categories.ids";
  if (key === "visible" || key === "featured") return key;
  void loc;
  return `${key as TextKey}.value`;
}

export function PresentationForm({ product }: { product: AdminProductDetail }) {
  const presentation = product.presentation;
  const queryClient = useQueryClient();
  const toast = useToast();
  const initial = toFormValues(presentation);
  const form = useForm<PresentationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial,
  });

  // Depois de salvar, o detalhe é recarregado: o formulário volta a refletir o servidor.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reinicia só quando o servidor muda a apresentação.
  useEffect(() => {
    form.reset(toFormValues(presentation));
  }, [presentation]);

  const save = useMutation({
    mutationFn: (patch: PresentationPatch) => adminApi.updatePresentation(product.id, patch),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const patch = buildPatch(values, initial);
    if (Object.keys(patch).length === 0) {
      toast.push("info", "Nenhuma alteração para salvar.");
      return;
    }
    try {
      await save.mutateAsync(patch);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        form.setError("categories.ids", { type: "server", message: error.message });
        return;
      }
      let mapped = false;
      if (error instanceof ApiError && error.status === 422) {
        for (const e of error.errors) {
          const key = e.loc.find((part) =>
            FIELD_KEYS.includes(part as (typeof FIELD_KEYS)[number]),
          );
          const path = typeof key === "string" ? target(key, e.loc) : null;
          if (path) {
            form.setError(path, { type: "server", message: e.msg });
            mapped = true;
          }
        }
      }
      if (!mapped) toast.push("error", errorMessage(error));
      return;
    }
    toast.push("success", "Apresentação na loja salva.");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "product", product.id] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
    ]);
  });

  return (
    <FormProvider {...form}>
      <form role="tabpanel" aria-label="Loja" className="adm-stack" onSubmit={onSubmit} noValidate>
        {TEXT_FIELDS.map((field) => (
          <TextOverride key={field.key} field={field} blingValue={presentation[field.key].bling} />
        ))}
        <CategoriesOverride presentation={presentation} />
        <fieldset className="adm-card">
          <legend>Exibição</legend>
          <label className="adm-switch">
            <input type="checkbox" {...form.register("visible")} />
            Visível na loja
          </label>
          <label className="adm-switch">
            <input type="checkbox" {...form.register("featured")} />
            Destaque
          </label>
        </fieldset>
        <div>
          <button type="submit" className="adm-btn adm-btn-primary" disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
