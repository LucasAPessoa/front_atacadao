// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "./DataTable";
import type { Column } from "./DataTable";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Row = { id: string; name: string };
const rows: Row[] = [{ id: "1", name: "A" }];

function mount(columns: Column<Row>[], onSortChange?: (s: { key: string; order: string }) => void) {
  const host = document.createElement("div");
  document.body.append(host);
  act(() =>
    createRoot(host).render(
      <DataTable
        caption="Teste"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        sort={{ key: "name", order: "asc" }}
        onSortChange={onSortChange as never}
      />,
    ),
  );
  return host;
}

describe("DataTable em cartões", () => {
  it("tabela sem coluna `card` não recebe a classe nem o select", () => {
    const host = mount([{ key: "n", header: "Nome", sortKey: "name", render: (r) => r.name }]);
    expect(host.querySelector(".adm-table-cards")).toBeNull();
    expect(host.querySelector(".adm-sort-select")).toBeNull();
  });

  it("com `card` recebe a classe e o select de ordenação liga ao onSortChange", () => {
    const onSort = vi.fn();
    const host = mount(
      [
        { key: "n", header: "Nome", sortKey: "name", card: "title", render: (r) => r.name },
        { key: "p", header: "Preço", sortKey: "price", card: "field", render: () => "1" },
      ],
      onSort,
    );
    expect(host.querySelector(".adm-table-cards")).not.toBeNull();
    const select = host.querySelector("select") as HTMLSelectElement;
    expect(select.value).toBe("name:asc");
    expect(select.options).toHaveLength(4);
    act(() => {
      select.value = "price:desc";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onSort).toHaveBeenCalledWith({ key: "price", order: "desc" });
  });
});

describe("DataTable com largura fixa", () => {
  type Item = { id: string; name: string; sku: string; note?: string };
  const items: Item[] = [
    { id: "1", name: "Arroz agulhinha tipo 1 pacote de 5kg", sku: "ARZ-5" },
    { id: "2", name: "Feijão", sku: "FJ-1" },
  ];
  const columns: Column<Item>[] = [
    { key: "name", header: "Produto", width: 240, minWidth: 120, render: (i) => i.name },
    { key: "sku", header: "SKU", render: (i) => <strong>{i.sku}</strong> },
    { key: "note", header: "Obs.", wrap: true, render: (i) => i.note ?? "—" },
  ];

  function render(host: HTMLElement, rowsToShow: Item[] = items) {
    const root = createRoot(host);
    act(() =>
      root.render(
        <DataTable
          caption="Itens"
          storageKey="teste"
          columns={columns}
          rows={rowsToShow}
          rowKey={(r) => r.id}
        />,
      ),
    );
    return root;
  }

  function setup(rowsToShow?: Item[]) {
    const host = document.createElement("div");
    document.body.append(host);
    const root = render(host, rowsToShow);
    return { host, root };
  }

  const colWidths = (host: HTMLElement) =>
    [...host.querySelectorAll("col")].map((col) => (col as HTMLElement).style.width);
  const handle = (host: HTMLElement, index: number) =>
    host.querySelectorAll<HTMLElement>('[role="separator"]')[index];
  const key = (el: HTMLElement, k: string, shiftKey = false) =>
    act(() => {
      el.dispatchEvent(new KeyboardEvent("keydown", { key: k, shiftKey, bubbles: true }));
    });

  beforeEach(() => window.localStorage.clear());

  it("usa a largura da coluna ou 160px; a última absorve a folga, sem alça; mínimo é a soma", () => {
    const { host } = setup();
    expect(colWidths(host)).toEqual(["240px", "160px", ""]);
    const table = host.querySelector("table") as HTMLTableElement;
    expect(table.style.getPropertyValue("--adm-table-min")).toBe("560px");
    expect(host.querySelectorAll('[role="separator"]')).toHaveLength(2);
  });

  it("a largura não muda com o conteúdo ao trocar de página", () => {
    const { host, root } = setup();
    act(() =>
      root.render(
        <DataTable
          caption="Itens"
          storageKey="teste"
          columns={columns}
          rows={[{ id: "3", name: "X", sku: "Y" }]}
          rowKey={(r) => r.id}
        />,
      ),
    );
    expect(colWidths(host)).toEqual(["240px", "160px", ""]);
  });

  it("célula truncável mostra o texto completo no title; coluna wrap quebra e não tem title", () => {
    const { host } = setup();
    const cells = host.querySelectorAll("tbody tr:first-child td");
    expect(cells[0].getAttribute("title")).toBe("Arroz agulhinha tipo 1 pacote de 5kg");
    expect(cells[1].getAttribute("title")).toBe("ARZ-5");
    expect(cells[2].classList.contains("adm-wrap")).toBe(true);
    expect(cells[2].hasAttribute("title")).toBe(false);
  });

  it("title separa blocos com ' · ' e aceita title() explícito", () => {
    const host = document.createElement("div");
    document.body.append(host);
    act(() =>
      createRoot(host).render(
        <DataTable
          caption="Blocos"
          columns={[
            {
              key: "a",
              header: "A",
              render: (r: Item) => (
                <>
                  {r.name}
                  <div className="adm-muted">Saca 25kg</div>
                </>
              ),
            },
            { key: "b", header: "B", title: () => "texto livre", render: () => "x" },
            { key: "c", header: "C", render: () => "y" },
          ]}
          rows={[items[1]]}
          rowKey={(r) => r.id}
        />,
      ),
    );
    const cells = host.querySelectorAll("tbody td");
    expect(cells[0].getAttribute("title")).toBe("Feijão · Saca 25kg");
    expect(cells[1].getAttribute("title")).toBe("texto livre");
  });

  it("redimensiona pelo teclado, respeita o mínimo e salva por tabela", () => {
    const { host } = setup();
    const sep = handle(host, 0);
    expect(sep.getAttribute("aria-label")).toBe("Largura da coluna Produto");
    key(sep, "ArrowRight");
    expect(colWidths(host)[0]).toBe("256px");
    key(sep, "ArrowLeft", true);
    expect(colWidths(host)[0]).toBe("192px");
    key(sep, "Home");
    expect(colWidths(host)[0]).toBe("120px");
    expect(JSON.parse(window.localStorage.getItem("adm-table-widths:teste") ?? "{}")).toEqual({
      name: 120,
    });

    const again = setup();
    expect(colWidths(again.host)[0]).toBe("120px");
  });

  it("redimensiona arrastando a borda e grava ao soltar", () => {
    const { host } = setup();
    const sep = handle(host, 1);
    act(() => {
      sep.dispatchEvent(new MouseEvent("pointerdown", { clientX: 100, button: 0, bubbles: true }));
    });
    act(() => {
      sep.dispatchEvent(new MouseEvent("pointermove", { clientX: 150, bubbles: true }));
    });
    expect(colWidths(host)[1]).toBe("210px");
    expect(window.localStorage.getItem("adm-table-widths:teste")).toBeNull();
    act(() => {
      sep.dispatchEvent(new MouseEvent("pointerup", { clientX: 150, bubbles: true }));
    });
    expect(JSON.parse(window.localStorage.getItem("adm-table-widths:teste") ?? "{}")).toEqual({
      sku: 210,
    });
    act(() => {
      sep.dispatchEvent(new MouseEvent("pointermove", { clientX: 400, bubbles: true }));
    });
    expect(colWidths(host)[1]).toBe("210px");
  });

  it("Restaurar larguras só aparece com largura escolhida e volta ao padrão", () => {
    const { host } = setup();
    const restore = () =>
      [...host.querySelectorAll("button")].find((b) => b.textContent === "Restaurar larguras");
    expect(restore()).toBeUndefined();
    key(handle(host, 0), "ArrowRight");
    act(() => restore()?.click());
    expect(colWidths(host)).toEqual(["240px", "160px", ""]);
    expect(restore()).toBeUndefined();
    expect(window.localStorage.getItem("adm-table-widths:teste")).toBeNull();
  });

  it("sem localStorage (erro ao ler e gravar) a tabela funciona com o padrão", () => {
    window.localStorage.setItem("adm-table-widths:teste", "{quebrado");
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("cota");
    });
    try {
      const { host } = setup();
      expect(colWidths(host)).toEqual(["240px", "160px", ""]);
      key(handle(host, 0), "ArrowRight");
      expect(colWidths(host)[0]).toBe("256px");
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });

  it("JSON inválido salvo é ignorado", () => {
    window.localStorage.setItem("adm-table-widths:teste", '{"name":"x","sku":300}');
    const { host } = setup();
    expect(colWidths(host)).toEqual(["240px", "300px", ""]);
  });
});
