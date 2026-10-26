import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api";
import type { ProductListParams, ProductSortKey } from "../../api/types";
import { useUrlState } from "../../ui/useUrlState";
import {
  PAGE_SIZE,
  type ProductFilters,
  ProductsListView,
  productFilterDefaults,
} from "./ProductsListView";

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

export function ProductsList() {
  const [filters, update] = useUrlState(productFilterDefaults);
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
