import { useEffect, useId, useRef, useState } from "react";

export type MultiSelectOption = { value: string; label: string };

/**
 * Seleção múltipla compacta para a barra de filtros: um botão do tamanho de um campo
 * ("Todos", o rótulo da opção ou "N selecionados") que abre a lista de checkboxes.
 * Fecha com Esc (foco volta ao botão) ou clicando fora.
 */
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  allLabel = "Todos",
}: {
  label: string;
  options: readonly MultiSelectOption[];
  selected: readonly string[];
  onChange(next: string[]): void;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const labelId = `${id}-label`;
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      // Só com o foco no campo (ou em lugar nenhum: Safari não foca botão ao clicar).
      const active = document.activeElement;
      const inside = root.current?.contains(active) || !active || active === document.body;
      if (event.key !== "Escape" || !inside) return;
      setOpen(false);
      button.current?.focus();
    };
    // Tab para fora do campo fecha o painel (senão ele fica sobre a tabela).
    const onFocus = (event: FocusEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
    };
  }, [open]);

  const chosen = options.filter((option) => selected.includes(option.value));
  // Lista os escolhidos; o CSS corta com reticências e o title mostra todos.
  const summary = chosen.length === 0 ? allLabel : chosen.map((option) => option.label).join(", ");

  // Mantém a ordem das opções, não a ordem dos cliques.
  const toggle = (value: string) =>
    onChange(
      options
        .map((option) => option.value)
        .filter((v) => (v === value ? !selected.includes(v) : selected.includes(v))),
    );

  return (
    <div className="adm-field adm-multiselect" ref={root}>
      <label id={labelId} htmlFor={buttonId}>
        {label}
      </label>
      <button
        ref={button}
        id={buttonId}
        type="button"
        className="adm-multiselect-toggle"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={chosen.length > 1 ? summary : undefined}
        aria-labelledby={`${labelId} ${buttonId}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="adm-multiselect-value">{summary}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <fieldset id={panelId} className="adm-multiselect-panel">
          <legend className="adm-sr-only">{label}</legend>
          {options.map((option) => (
            <label key={option.value} className="adm-check-label">
              <input
                type="checkbox"
                value={option.value}
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
