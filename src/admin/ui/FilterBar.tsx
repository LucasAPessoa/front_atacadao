import type { ReactNode } from "react";

export function FilterBar({
  children,
  onClear,
  canClear = true,
}: {
  children: ReactNode;
  onClear?(): void;
  canClear?: boolean;
}) {
  return (
    <search className="adm-filterbar">
      {children}
      {onClear && (
        <button
          type="button"
          className="adm-btn adm-btn-ghost"
          disabled={!canClear}
          onClick={onClear}
        >
          Limpar filtros
        </button>
      )}
    </search>
  );
}
