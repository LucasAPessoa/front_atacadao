// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";
import { Tabs } from "./Tabs";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => {
  document.body.innerHTML = "";
});

const press = (key: string, shiftKey = false) =>
  act(() => {
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true }),
    );
  });

describe("Tabs", () => {
  it("setas, Home e End movem o foco e só a aba ativa entra na ordem de Tab", () => {
    const box = document.createElement("div");
    document.body.append(box);
    act(() =>
      createRoot(box).render(
        <Tabs
          label="Seções"
          active="a"
          onSelect={() => {}}
          tabs={[
            ["a", "A"],
            ["b", "B"],
            ["c", "C"],
          ]}
        />,
      ),
    );
    const tabs = [...box.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    tabs[0]?.focus();
    press("ArrowRight");
    expect(document.activeElement).toBe(tabs[1]);
    press("End");
    expect(document.activeElement).toBe(tabs[2]);
    press("ArrowRight");
    expect(document.activeElement).toBe(tabs[0]);
    press("ArrowLeft");
    expect(document.activeElement).toBe(tabs[2]);
    press("Home");
    expect(document.activeElement).toBe(tabs[0]);
  });
});

describe("ConfirmDialog (teclado)", () => {
  it("prende o foco no diálogo e devolve ao botão de origem ao fechar", () => {
    const box = document.createElement("div");
    document.body.append(box);
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const root = createRoot(box);
    const props = { title: "T", message: "M", onConfirm: vi.fn(), onCancel: vi.fn() };
    act(() => root.render(<ConfirmDialog open {...props} />));
    const [cancel, confirm] = [...box.querySelectorAll("button")];
    expect(document.activeElement).toBe(cancel);
    confirm?.focus();
    press("Tab");
    expect(document.activeElement).toBe(cancel);
    press("Tab", true);
    expect(document.activeElement).toBe(confirm);
    act(() => root.render(<ConfirmDialog open={false} {...props} />));
    expect(document.activeElement).toBe(opener);
  });

  it("re-render aberto (onCancel inline, busy) não perde o botão de origem", () => {
    const box = document.createElement("div");
    document.body.append(box);
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const root = createRoot(box);
    const render = (open: boolean, busy: boolean) =>
      act(() =>
        root.render(
          <ConfirmDialog
            open={open}
            busy={busy}
            title="T"
            message="M"
            onConfirm={() => {}}
            onCancel={() => {}}
          />,
        ),
      );
    render(true, false);
    render(true, true);
    render(true, false);
    render(false, false);
    expect(document.activeElement).toBe(opener);
  });
});
