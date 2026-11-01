import { useCallback, useRef, useState } from "react";

/** Largura padrão (px) de coluna sem `width`: nunca auto, para a tabela não "pular" com o conteúdo. */
export const DEFAULT_COLUMN_WIDTH = 160;
/** Menor largura (px) de coluna sem `minWidth`. */
export const DEFAULT_MIN_WIDTH = 64;
export const MAX_COLUMN_WIDTH = 800;

const PREFIX = "adm-table-widths:";

export type Widths = Record<string, number>;

function read(storageKey: string): Widths {
  try {
    const raw = window.localStorage.getItem(PREFIX + storageKey);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const widths: Widths = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) widths[key] = value;
    }
    return widths;
  } catch {
    return {};
  }
}

function write(storageKey: string, widths: Widths) {
  try {
    if (Object.keys(widths).length === 0) window.localStorage.removeItem(PREFIX + storageKey);
    else window.localStorage.setItem(PREFIX + storageKey, JSON.stringify(widths));
  } catch {
    // Sem armazenamento (aba privada, cota): a largura vale só nesta visita.
  }
}

/** Larguras escolhidas pelo usuário para uma tabela, salvas no navegador por `storageKey`. */
export function useColumnWidths(storageKey: string) {
  const [state, setState] = useState(() => ({ key: storageKey, widths: read(storageKey) }));
  // Outra tabela no mesmo componente: recarrega as larguras dela.
  const widths = state.key === storageKey ? state.widths : read(storageKey);
  if (state.key !== storageKey) setState({ key: storageKey, widths });
  const latest = useRef(widths);
  latest.current = widths;

  const apply = useCallback(
    (next: Widths, persist: boolean) => {
      latest.current = next;
      if (persist) write(storageKey, next);
      setState({ key: storageKey, widths: next });
    },
    [storageKey],
  );

  /** `persist = false` durante o arraste; grave no fim com `persist()`. */
  const setWidth = useCallback(
    (column: string, width: number, persist = true) =>
      apply({ ...latest.current, [column]: width }, persist),
    [apply],
  );

  const persist = useCallback(() => write(storageKey, latest.current), [storageKey]);

  /** Sem `column`, volta todas as colunas ao padrão. */
  const reset = useCallback(
    (column?: string) => {
      if (column === undefined) return apply({}, true);
      const { [column]: _removed, ...rest } = latest.current;
      apply(rest, true);
    },
    [apply],
  );

  return { widths, setWidth, persist, reset };
}

export const clampWidth = (width: number, min: number) =>
  Math.round(Math.min(MAX_COLUMN_WIDTH, Math.max(min, width)));
