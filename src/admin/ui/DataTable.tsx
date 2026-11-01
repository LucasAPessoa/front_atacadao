import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";
import { SkeletonRows } from "./Skeleton";
import {
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_MIN_WIDTH,
  MAX_COLUMN_WIDTH,
  clampWidth,
  useColumnWidths,
} from "./useColumnWidths";

export type SortState = { key: string; order: "asc" | "desc" };

export type Column<T> = {
  key: string;
  header: string;
  render(row: T): ReactNode;
  /** Presente = coluna ordenável; o valor vai para `sort` na API. */
  sortKey?: string;
  align?: "left" | "right";
  /** Em ≤ 768px a tabela vira cartões e só colunas com `card` aparecem; "title" destaca a coluna. */
  card?: "title" | "field";
  /** Largura padrão em px (sem ela, 160px). A tabela não dimensiona pelo conteúdo. */
  width?: number;
  /** Menor largura em px ao redimensionar (sem ela, 64px). */
  minWidth?: number;
  /** Texto completo da célula para o tooltip; sem ele, usa o texto renderizado. */
  title?(row: T): string;
  /** Quebra o texto em linhas em vez de truncar (avisos, motivos, variação). A largura segue fixa. */
  wrap?: boolean;
};

/** Coluna de seleção: largura do alvo de toque. */
const CHECK_WIDTH = 48;
/** Passo do redimensionamento por teclado (Shift multiplica por 4). */
const KEY_STEP = 16;

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
  /** Chave das larguras salvas no navegador; sem ela, usa `caption`. */
  storageKey?: string;
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
  storageKey,
}: DataTableProps<T>) {
  const { widths, setWidth, persist, reset } = useColumnWidths(storageKey ?? caption);
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

  const cards = columns.some((column) => column.card !== undefined);
  const sortable = columns.filter((column) => column.sortKey !== undefined);
  const sortValue = sort ? `${sort.key}:${sort.order}` : "";

  const minOf = (column: Column<T>) => column.minWidth ?? DEFAULT_MIN_WIDTH;
  const widthOf = (column: Column<T>) =>
    clampWidth(widths[column.key] ?? column.width ?? DEFAULT_COLUMN_WIDTH, minOf(column));
  const total =
    columns.reduce((sum, column) => sum + widthOf(column), 0) + (selectable ? CHECK_WIDTH : 0);
  const customized = columns.some((column) => widths[column.key] !== undefined);
  // A última coluna absorve a folga quando o contêiner é maior que a soma: assim as outras
  // ficam com a largura exata (o arraste acompanha o ponteiro). Ela não tem alça.
  const last = columns[columns.length - 1]?.key;

  const startDrag = (column: Column<T>) => (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    const startX = event.clientX;
    const startWidth = widthOf(column);
    handle.setPointerCapture?.(event.pointerId);
    const move = (e: globalThis.PointerEvent) =>
      setWidth(column.key, clampWidth(startWidth + e.clientX - startX, minOf(column)), false);
    const end = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
      persist();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  };

  const resizeByKey = (column: Column<T>) => (event: KeyboardEvent<HTMLElement>) => {
    const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP;
    const current = widthOf(column);
    let next: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = current + step;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = current - step;
    else if (event.key === "Home") next = minOf(column);
    else if (event.key === "Escape" || event.key === "Delete") {
      event.preventDefault();
      reset(column.key);
      return;
    }
    if (next === undefined) return;
    event.preventDefault();
    setWidth(column.key, clampWidth(next, minOf(column)));
  };

  /** Tooltip com o texto completo, já que a célula trunca com reticências. Coluna `wrap` mostra tudo. */
  const cellTitle = (column: Column<T>, row: T) => (el: HTMLTableCellElement | null) => {
    if (!el) return;
    const text = column.wrap ? "" : column.title ? column.title(row) : visibleText(el);
    if (text) el.title = text;
    else el.removeAttribute("title");
  };

  const table = (
    <section
      className={cards ? "adm-table-wrap adm-table-cards" : "adm-table-wrap"}
      aria-busy={loading}
      aria-label={caption}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: região rolável precisa de foco para rolar por teclado
      tabIndex={0}
    >
      <table className="adm-table" style={{ "--adm-table-min": `${total}px` } as CSSProperties}>
        <caption className="adm-sr-only">{caption}</caption>
        <colgroup>
          {selectable && <col style={{ width: CHECK_WIDTH }} />}
          {columns.map((column) => (
            <col
              key={column.key}
              style={column.key === last ? undefined : { width: widthOf(column) }}
            />
          ))}
        </colgroup>
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
                      <span className="adm-th-label" title={column.header}>
                        {column.header}
                      </span>
                      <span aria-hidden="true" className="adm-sort-dir">
                        {active ? (sort?.order === "asc" ? "▲" : "▼") : ""}
                      </span>
                    </button>
                  ) : (
                    <span className="adm-th-label" title={column.header}>
                      {column.header}
                    </span>
                  )}
                  {column.key !== last && (
                    <ColumnHandle
                      header={column.header}
                      width={widthOf(column)}
                      min={minOf(column)}
                      onPointerDown={startDrag(column)}
                      onKeyDown={resizeByKey(column)}
                      onReset={() => reset(column.key)}
                    />
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
                  <td
                    key={column.key}
                    className={
                      [column.align === "right" && "adm-num", column.wrap && "adm-wrap"]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                    data-card={column.card}
                    data-label={column.header}
                    ref={cellTitle(column, row)}
                  >
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

  const tools = customized && (
    <div className="adm-table-tools" data-cards={cards || undefined}>
      <button type="button" className="adm-btn adm-btn-ghost" onClick={() => reset()}>
        Restaurar larguras
      </button>
    </div>
  );

  if (!cards || sortable.length === 0 || !onSortChange)
    return (
      <>
        {table}
        {tools}
      </>
    );
  return (
    <>
      <div className="adm-field adm-sort-select">
        <label htmlFor="adm-sort-select">Ordenar por</label>
        <select
          id="adm-sort-select"
          value={sortValue}
          onChange={(e) => {
            const [key, order] = e.target.value.split(":");
            onSortChange({ key, order: order === "desc" ? "desc" : "asc" });
          }}
        >
          {sortable.flatMap((column) =>
            (["asc", "desc"] as const).map((order) => (
              <option key={`${column.sortKey}:${order}`} value={`${column.sortKey}:${order}`}>
                {column.header} ({order === "asc" ? "crescente" : "decrescente"})
              </option>
            )),
          )}
        </select>
      </div>
      {table}
      {tools}
    </>
  );
}

const BLOCK = new Set(["DIV", "P", "UL", "OL", "LI"]);

/** Texto da célula com " · " entre blocos (nome e variação não grudam no tooltip). */
function visibleText(el: Element): string {
  const parts: string[] = [];
  let line = "";
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) line += node.textContent ?? "";
    else if (node instanceof Element && BLOCK.has(node.tagName)) {
      if (line.trim()) parts.push(line.trim());
      line = "";
      node.childNodes.forEach(walk);
      if (line.trim()) parts.push(line.trim());
      line = "";
    } else node.childNodes.forEach(walk);
  };
  el.childNodes.forEach(walk);
  if (line.trim()) parts.push(line.trim());
  return parts.join(" · ");
}

function ColumnHandle({
  header,
  width,
  min,
  onPointerDown,
  onKeyDown,
  onReset,
}: {
  header: string;
  width: number;
  min: number;
  onPointerDown(event: PointerEvent<HTMLElement>): void;
  onKeyDown(event: KeyboardEvent<HTMLElement>): void;
  onReset(): void;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: <hr> não recebe foco nem teclado; separador focável é o padrão ARIA de alça de redimensionar
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={`Largura da coluna ${header}`}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={MAX_COLUMN_WIDTH}
      aria-valuetext={`${width} pixels`}
      title="Arraste ou use as setas para ajustar. Duplo clique restaura."
      tabIndex={0}
      className="adm-col-resize"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={onReset}
    />
  );
}
