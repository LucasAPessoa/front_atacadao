// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
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
