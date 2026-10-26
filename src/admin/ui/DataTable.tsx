import type { ReactNode } from "react";
import { SkeletonRows } from "./Skeleton";

export type SortState = { key: string; order: "asc" | "desc" };

export type Column<T> = {
  key: string;
  header: string;
  render(row: T): ReactNode;
  /** Presente = coluna ordenável; o valor vai para `sort` na API. */
  sortKey?: string;
  align?: "left" | "right";
};

export type DataTableProps<T> = {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey(row: T): string;
  loading?: boolean;
  empty?: ReactNode;
  sort?: SortState;
  onSortChange?(sort: SortState): void;
  selectable?: boolean;
  selected?: ReadonlySet<string>;
  onSelectedChange?(selected: Set<string>): void;
};

export function nextSort(current: SortState | undefined, sortKey: string): SortState {
  return current?.key === sortKey
    ? { key: sortKey, order: current.order === "asc" ? "desc" : "asc" }
    : { key: sortKey, order: "asc" };
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  loading = false,
  empty,
  sort,
  onSortChange,
  selectable = false,
  selected = new Set<string>(),
  onSelectedChange,
}: DataTableProps<T>) {
  if (loading && rows.length === 0) return <SkeletonRows />;
  if (!loading && rows.length === 0 && empty) return <>{empty}</>;

  const keys = rows.map(rowKey);
  const allSelected = keys.length > 0 && keys.every((key) => selected.has(key));
  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectedChange?.(next);
  };
  const toggleAll = () => onSelectedChange?.(allSelected ? new Set() : new Set(keys));

  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: região rolável precisa de foco para rolar por teclado
    <section className="adm-table-wrap" aria-busy={loading} aria-label={caption} tabIndex={0}>
      <table className="adm-table">
        <caption className="adm-sr-only">{caption}</caption>
        <thead>
          <tr>
            {selectable && (
              <th scope="col" className="adm-col-check">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>
            )}
            {columns.map((column) => {
              const active = column.sortKey !== undefined && sort?.key === column.sortKey;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={column.align === "right" ? "adm-num" : undefined}
                  aria-sort={
                    active ? (sort?.order === "asc" ? "ascending" : "descending") : undefined
                  }
                >
                  {column.sortKey !== undefined ? (
                    <button
                      type="button"
                      className="adm-sort"
                      onClick={() => onSortChange?.(nextSort(sort, column.sortKey as string))}
                    >
                      {column.header}
                      <span aria-hidden="true">
                        {active ? (sort?.order === "asc" ? " ▲" : " ▼") : ""}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            return (
              <tr key={key} aria-selected={selectable ? selected.has(key) : undefined}>
                {selectable && (
                  <td className="adm-col-check">
                    <input
                      type="checkbox"
                      aria-label="Selecionar linha"
                      checked={selected.has(key)}
                      onChange={() => toggle(key)}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className={column.align === "right" ? "adm-num" : undefined}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
