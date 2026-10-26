import type { KeyboardEvent } from "react";

/** Abas (WAI-ARIA tabs, ativação manual por clique/Enter; setas, Home e End movem o foco). */
export function Tabs<K extends string>({
  label,
  tabs,
  active,
  onSelect,
}: {
  label: string;
  tabs: readonly (readonly [K, string])[];
  active: K;
  onSelect(key: K): void;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    const last = buttons.length - 1;
    const next =
      event.key === "ArrowRight"
        ? (current + 1) % buttons.length
        : event.key === "ArrowLeft"
          ? (current + last) % buttons.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : -1;
    if (next < 0) return;
    event.preventDefault();
    buttons[next]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="adm-tabs" onKeyDown={onKeyDown}>
      {tabs.map(([key, text]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={active === key}
          tabIndex={active === key ? 0 : -1}
          className="adm-tab"
          onClick={() => onSelect(key)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
