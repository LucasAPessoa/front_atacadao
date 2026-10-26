import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

export type UrlState = Record<string, string>;

/** Lê da query string, caindo nos padrões para chaves ausentes. */
export function readUrlState<T extends UrlState>(params: URLSearchParams, defaults: T): T {
  const state: UrlState = {};
  for (const key of Object.keys(defaults)) state[key] = params.get(key) ?? defaults[key];
  return state as T;
}

/**
 * Aplica o patch na query string. Valores iguais ao padrão saem da URL; qualquer mudança em outra
 * chave que não `page` volta `pageKey` ao padrão (filtro novo = primeira página).
 */
export function writeUrlState<T extends UrlState>(
  current: URLSearchParams,
  patch: Partial<T>,
  defaults: T,
  pageKey = "skip",
): URLSearchParams {
  const next = new URLSearchParams(current);
  const resetPage = Object.keys(patch).some((key) => key !== pageKey) && !(pageKey in patch);
  const merged: UrlState = { ...patch } as UrlState;
  if (resetPage && pageKey in defaults) merged[pageKey] = defaults[pageKey];
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === defaults[key] || value === "") next.delete(key);
    else next.set(key, value);
  }
  return next;
}

export function useUrlState<T extends UrlState>(defaults: T, pageKey = "skip") {
  const [params, setParams] = useSearchParams();
  // `defaults` costuma ser literal; a identidade estável vem do conteúdo.
  const signature = JSON.stringify(defaults);
  // biome-ignore lint/correctness/useExhaustiveDependencies: signature representa defaults
  const stable = useMemo(() => defaults, [signature]);
  const state = useMemo(() => readUrlState(params, stable), [params, stable]);
  const update = useCallback(
    (patch: Partial<T>, options: { replace?: boolean } = {}) =>
      setParams((current) => writeUrlState(current, patch, stable, pageKey), {
        replace: options.replace ?? true,
      }),
    [setParams, stable, pageKey],
  );
  return [state, update] as const;
}

export const toInt = (value: string, fallback: number) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
