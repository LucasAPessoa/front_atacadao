import type { CSSProperties } from "react";

export function Skeleton({ width = "100%", height = "1rem" }: { width?: string; height?: string }) {
  const style: CSSProperties = { width, height };
  return <span className="adm-skeleton" style={style} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="adm-skeleton-rows" role="status" aria-label="Carregando">
      {Array.from({ length: rows }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: linhas decorativas sem identidade
        <Skeleton key={index} height="1.5rem" />
      ))}
    </div>
  );
}
