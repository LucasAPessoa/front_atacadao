import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { ApiError } from "../../../shared/http";
import { adminApi } from "../../api";
import type { ProductListParams, ProductSortKey } from "../../api/types";
import { errorMessage } from "../../ui/errors";
import { useToast } from "../../ui/Toast";
import { useUrlState } from "../../ui/useUrlState";
import {
  type BulkAction,
  PAGE_SIZE,
  type ProductFilters,
  ProductsListView,
  productFilterDefaults,
} from "./ProductsListView";

const SORT_KEYS: readonly string[] = ["name", "price", "stock", "updated_at"];

/** Valores inválidos vindos da URL caem no padrão (evita 422). */
export function sanitizeFilters(f: ProductFilters): ProductFilters {
  return {
    ...f,
    sort: SORT_KEYS.includes(f.sort) ? f.sort : productFilterDefaults.sort,
    order: f.order === "desc" || f.order === "asc" ? f.order : productFilterDefaults.order,
  };
}

const bool = (value: string) => (value === "" ? undefined : value === "true");

export function toParams(f: ProductFilters): ProductListParams {
  return {
    q: f.q.trim() || undefined,
    category_id: f.category_id || undefined,
    active: bool(f.active),
    visible: bool(f.visible),
    featured: bool(f.featured),
    low_stock: bool(f.low_stock),
    pending: bool(f.pending),
    customized: bool(f.customized),
    sort: f.sort as ProductSortKey,
    order: f.order === "desc" ? "desc" : "asc",
    skip: Number.parseInt(f.skip, 10) || 0,
    limit: PAGE_SIZE,
  };
}

const bulkPatch: Record<BulkAction, { visible?: boolean; featured?: boolean }> = {
  hide: { visible: false },
  show: { visible: true },
  feature: { featured: true },
  unfeature: { featured: false },
};
const bulkDone: Record<BulkAction, string> = {
  hide: "ocultado(s) da loja",
  show: "exibido(s) na loja",
  feature: "destacado(s)",
  unfeature: "sem destaque",
};

export function ProductsList() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<BulkAction | null>(null);
  const bulk = useMutation({
    mutationFn: (action: BulkAction) =>
      adminApi.bulkPresentation({ product_ids: [...selected], ...bulkPatch[action] }),
  });
  const confirmBulk = async () => {
    if (!pending) return;
    try {
      const result = await bulk.mutateAsync(pending);
      toast.push("success", `${result.updated} produto(s) ${bulkDone[pending]}.`);
      setSelected(new Set());
    } catch (error) {
      // 404 traz no detail os IDs inexistentes; nada foi gravado.
      toast.push(
        "error",
        error instanceof ApiError && error.status === 404 ? error.message : errorMessage(error),
      );
    }
    setPending(null);
    await queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
  };

  const [rawFilters, update] = useUrlState(productFilterDefaults);
  const filters = sanitizeFilters(rawFilters);
  // A seleção vale só para a página/filtro atual: qualquer mudança da URL (inclusive voltar/avançar) a limpa.
  const { search } = useLocation();
  // biome-ignore lint/correctness/useExhaustiveDependencies: `search` é o gatilho do efeito.
  useEffect(() => setSelected(new Set()), [search]);
  const params = toParams(filters);
  const products = useQuery({
    queryKey: ["admin", "products", params],
    queryFn: ({ signal }) => adminApi.products(params, signal),
    placeholderData: keepPreviousData,
  });
  const categories = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: ({ signal }) => adminApi.categories(signal),
    staleTime: 5 * 60_000,
  });

  return (
    <ProductsListView
      selected={selected}
      onSelectedChange={setSelected}
      pendingAction={pending}
      bulkBusy={bulk.isPending}
      onBulkRequest={setPending}
      onBulkConfirm={() => void confirmBulk()}
      onBulkCancel={() => setPending(null)}
      filters={filters}
      categories={categories.data ?? []}
      items={products.data?.items ?? []}
      total={products.data?.meta.total ?? 0}
      loading={products.isFetching}
      error={products.error}
      onChange={update}
      onClear={() => update({ ...productFilterDefaults })}
      onRetry={() => void products.refetch()}
    />
  );
}
