import { useEffect, useRef, useState } from "react";

export const SEARCH_DEBOUNCE_MS = 300;

export function SearchInput({
  value,
  onChange,
  label = "Buscar",
  placeholder = "Buscar…",
}: {
  value: string;
  /** Chamado 300 ms depois da última digitação. */
  onChange(value: string): void;
  label?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState(value);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };

  // Mudança externa (ex.: "Limpar filtros") atualiza o campo.
  useEffect(() => setText(value), [value]);

  useEffect(() => {
    if (text === latest.current.value) return;
    const timer = setTimeout(() => latest.current.onChange(text), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <div className="adm-field adm-search">
      <label htmlFor="adm-search-input">{label}</label>
      <input
        id="adm-search-input"
        type="search"
        value={text}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
      />
    </div>
  );
}
