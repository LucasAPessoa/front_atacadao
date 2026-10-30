// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";
import { Pagination, pageInfo } from "./Pagination";
import { readUrlState, useUrlState, writeUrlState } from "./useUrlState";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Pagination", () => {
  it("calcula páginas e limites", () => {
    expect(pageInfo(137, 0, 25)).toMatchObject({
      page: 1,
      pages: 6,
      hasPrev: false,
      hasNext: true,
    });
    expect(pageInfo(137, 125, 25)).toMatchObject({ page: 6, hasNext: false });
    expect(pageInfo(0, 0, 25)).toMatchObject({ page: 1, pages: 1 });
  });
  it("desabilita Anterior na primeira página e mostra total", () => {
    const html = renderToStaticMarkup(
      <Pagination total={137} skip={0} limit={25} onChange={() => {}} />,
    );
    expect(html).toContain("Página 1 de 6 · 137 itens");
    expect(html).toMatch(/disabled="">Anterior/);
    expect(html).not.toMatch(/disabled="">Próxima/);
  });
  it("emite o novo skip", () => {
    const onChange = vi.fn();
    const box = document.createElement("div");
    act(() =>
      createRoot(box).render(<Pagination total={100} skip={25} limit={25} onChange={onChange} />),
    );
    const [prev, next] = Array.from(box.querySelectorAll("button"));
    act(() => next.click());
    act(() => prev.click());
    expect(onChange.mock.calls).toEqual([[50], [0]]);
  });
});

const probeDefaults = { q: "", skip: "0", sort: "name" };
const probe = {
  update: (() => {}) as ReturnType<typeof useUrlState<typeof probeDefaults>>[1],
  search: "",
};

function Probe() {
  const [, set] = useUrlState(probeDefaults);
  probe.update = set;
  probe.search = useLocation().search;
  return null;
}

describe("useUrlState", () => {
  const defaults = { q: "", skip: "0", sort: "name" };
  it("lê com padrões e escreve só o que difere, resetando a página", () => {
    expect(readUrlState(new URLSearchParams("q=ab"), defaults)).toEqual({
      q: "ab",
      skip: "0",
      sort: "name",
    });
    const next = writeUrlState(new URLSearchParams("skip=50&q=a"), { q: "b" }, defaults);
    expect(next.toString()).toBe("q=b");
    const same = writeUrlState(new URLSearchParams("q=b"), { skip: "25" }, defaults);
    expect(same.toString()).toBe("q=b&skip=25");
  });
  it("hook sincroniza com a query string", () => {
    const box = document.createElement("div");
    act(() =>
      createRoot(box).render(
        <MemoryRouter initialEntries={["/x?skip=25"]}>
          <Probe />
        </MemoryRouter>,
      ),
    );
    act(() => probe.update({ q: "abc" }));
    expect(probe.search).toBe("?q=abc");
  });
});

describe("ConfirmDialog", () => {
  const props = {
    title: "Excluir",
    message: "Tem certeza?",
    onConfirm: () => {},
    onCancel: () => {},
  };
  it("fechado não renderiza", () => {
    expect(renderToStaticMarkup(<ConfirmDialog open={false} {...props} />)).toBe("");
  });
  it("aberto é alertdialog com título e ações", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog open confirmLabel="Excluir" tone="danger" {...props} />,
    );
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain("Tem certeza?");
    expect(html).toContain("adm-btn-danger");
  });
  it("confirma, cancela e fecha com Escape", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const box = document.createElement("div");
    document.body.append(box);
    act(() =>
      createRoot(box).render(
        <ConfirmDialog open {...props} onConfirm={onConfirm} onCancel={onCancel} />,
      ),
    );
    const [cancel, confirm] = Array.from(box.querySelectorAll("button"));
    act(() => confirm.click());
    act(() => cancel.click());
    act(() => void document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
