import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { ApiError } from "../../../shared/http";
import { adminApi } from "../../api";
import { EmptyState } from "../../ui/EmptyState";
import { ErrorState } from "../../ui/ErrorState";
import { SkeletonRows } from "../../ui/Skeleton";
import { ProductDetailView } from "./ProductDetailView";

export function ProductDetail() {
  const { id = "" } = useParams();
  const query = useQuery({
    queryKey: ["admin", "product", id],
    queryFn: ({ signal }) => adminApi.product(id, signal),
  });

  if (query.isPending) return <SkeletonRows />;
  if (query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 422))
    return <EmptyState title="Produto não encontrado">Ele pode ter sido removido.</EmptyState>;
  if (query.error || !query.data)
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <ProductDetailView product={query.data} />;
}
