import { Link } from "react-router";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import type { AdminProductSummary, Category, ProductSortKey } from "../../api/types";
import { DataTable } from "../../ui/DataTable";
import type { Column, SortState } from "../../ui/DataTable";
import { EmptyState } from "../../ui/EmptyState";
import { ErrorState } from "../../ui/ErrorState";
import { FilterBar } from "../../ui/FilterBar";
import { Pagination } from "../../ui/Pagination";
import { SearchInput } from "../../ui/SearchInput";
import { formatPriceRange } from "./format";
import { pricingStatusLabels, warningLabels, warningText } from "./pricing";

export const PAGE_SIZE = 25;

export const productFilterDefaults = {
  q: "",
  category_id: "",
  active: "",
  visible: "",
  featured: "",
  low_stock: "",
  pending: "",
  pricing_status: "",
  warning: "",
  listed: "",
  sort: "name",
  order: "asc",
  skip: "0",
};
export type ProductFilters = typeof productFilterDefaults;

const triFilters: [keyof ProductFilters, string][] = [
  ["active", "À venda"],
  ["visible", "Visível"],
  ["featured", "Destaque"],
  ["low_stock", "Estoque baixo"],
  ["pending", "Pendência"],
  ["listed", "Na loja do site"],
];

/** Estado do produto na loja do site: fora da loja, aguardando preços ou ativo. */
export const productState = (p: AdminProductSummary) =>
  !p.store_listed
    ? { label: "Fora da loja do site", tone: undefined }
    : p.pricing_status === "pending"
      ? { label: pricingStatusLabels.pending, tone: "warning" }
      : { label: "Ativo", tone: "success" };

const yesNo = (value: boolean) => (
  <span className="adm-badge" data-tone={value ? "success" : undefined}>
    {value ? "Sim" : "Não"}
  </span>
);

const columns: Column<AdminProductSummary>[] = [
  {
    key: "image",
    header: "Imagem",
    render: (p) =>
      p.main_image_url ? (
        <img className="adm-thumb" src={p.main_image_url} alt="" loading="lazy" />
      ) : (
        <span className="adm-thumb adm-thumb-empty" aria-hidden="true" />
      ),
  },
  {
    key: "name",
    header: "Produto",
    card: "title",
    sortKey: "name",
    render: (p) => (
      <>
        <Link to={`/produtos/${p.id}`}>{p.name}</Link>
        <div className="adm-muted">{p.code}</div>
      </>
    ),
  },
  {
    key: "price",
    header: "Preço",
    card: "field",
    sortKey: "price",
    align: "right",
    render: (p) => formatPriceRange(p.min_price, p.max_price),
  },
  {
    key: "stock",
    header: "Estoque",
    card: "field",
    sortKey: "stock",
    align: "right",
    render: (p) => (
      <>
        {p.stock}{" "}
        {p.low_stock && (
          <span className="adm-badge" data-tone="warning">
            Baixo
          </span>
        )}
      </>
    ),
  },
  { key: "active", header: "À venda", render: (p) => yesNo(p.is_active) },
  { key: "visible", header: "Visível", render: (p) => yesNo(p.visible) },
  { key: "featured", header: "Destaque", render: (p) => yesNo(p.featured) },
  {
    key: "pending",
    header: "Pendência",
    align: "right",
    render: (p) =>
      p.pending_count > 0 ? (
        <span className="adm-badge" data-tone="warning">
          {p.pending_count}
        </span>
      ) : (
        "0"
      ),
  },
  {
    key: "pricing",
    header: "Preços",
    card: "field",
    render: (p) => {
      const state = productState(p);
      return (
        <>
          <span className="adm-badge" data-tone={state.tone}>
            {state.label}
          </span>
          {p.warnings.length > 0 && (
            <ul className="adm-muted" aria-label={`Avisos de ${p.name}`}>
              {p.warnings.map((w) => (
                <li key={w}>{warningText(w)}</li>
              ))}
            </ul>
          )}
        </>
      );
    },
  },
  {
    key: "updated",
    header: "Atualizado",
    sortKey: "updated_at",
    render: (p) => new Date(p.updated_at).toLocaleDateString("pt-BR"),
  },
];

export const BULK_MAX = 100;

export type BulkAction = "hide" | "show" | "feature" | "unfeature" | "confirm_pricing";
export const bulkActions: { key: BulkAction; label: string }[] = [
  { key: "hide", label: "Ocultar da loja" },
  { key: "show", label: "Mostrar na loja" },
  { key: "feature", label: "Destacar" },
  { key: "unfeature", label: "Remover destaque" },
  { key: "confirm_pricing", label: "Confirmar preços" },
];
const plural = (n: number) => `${n} ${n === 1 ? "produto" : "produtos"}`;
export function bulkTitle(action: BulkAction, n: number): string {
  const items = plural(n);
  if (action === "hide") return `Ocultar ${items}?`;
  if (action === "show") return `Mostrar ${items} na loja?`;
  if (action === "confirm_pricing") return `Confirmar preços de ${items}?`;
  if (action === "feature") return `Destacar ${items}?`;
  return `Remover destaque de ${items}?`;
}

export type ProductsListViewProps = {
  selected: ReadonlySet<string>;
  onSelectedChange(selected: Set<string>): void;
  pendingAction: BulkAction | null;
  bulkBusy: boolean;
  onBulkRequest(action: BulkAction): void;
  onBulkConfirm(): void;
  onBulkCancel(): void;
  filters: ProductFilters;
  categories: Category[];
  items: AdminProductSummary[];
  total: number;
  loading: boolean;
  error: unknown;
  onChange(patch: Partial<ProductFilters>): void;
  onClear(): void;
  onRetry(): void;
};

export function ProductsListView(p: ProductsListViewProps) {
  const { filters } = p;
  const skip = Number.parseInt(filters.skip, 10) || 0;
  const sort: SortState = {
    key: filters.sort,
    order: filters.order === "desc" ? "desc" : "asc",
  };
  const dirty = (Object.keys(productFilterDefaults) as (keyof ProductFilters)[]).some(
    (key) => filters[key] !== productFilterDefaults[key],
  );

  return (
    <section aria-labelledby="adm-page-title">
      <div className="adm-page-header">
        <h1 id="adm-page-title">Produtos</h1>
      </div>
      <FilterBar onClear={p.onClear} canClear={dirty}>
        <SearchInput
          value={filters.q}
          onChange={(q) => p.onChange({ q })}
          label="Buscar produto"
          placeholder="Nome, código, SKU ou GTIN"
        />
        <div className="adm-field">
          <label htmlFor="flt-category">Categoria</label>
          <select
            id="flt-category"
            value={filters.category_id}
            onChange={(e) => p.onChange({ category_id: e.target.value })}
          >
            <option value="">Todas</option>
            {p.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {triFilters.map(([key, label]) => (
          <div className="adm-field" key={key}>
            <label htmlFor={`flt-${key}`}>{label}</label>
            <select
              id={`flt-${key}`}
              value={filters[key]}
              onChange={(e) => p.onChange({ [key]: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </div>
        ))}
        <div className="adm-field">
          <label htmlFor="flt-pricing_status">Preços</label>
          <select
            id="flt-pricing_status"
            value={filters.pricing_status}
            onChange={(e) => p.onChange({ pricing_status: e.target.value })}
          >
            <option value="">Todos</option>
            <option value="pending">{pricingStatusLabels.pending}</option>
            <option value="confirmed">{pricingStatusLabels.confirmed}</option>
          </select>
        </div>
        <div className="adm-field">
          <label htmlFor="flt-warning">Aviso</label>
          <select
            id="flt-warning"
            value={filters.warning}
            onChange={(e) => p.onChange({ warning: e.target.value })}
          >
            <option value="">Todos</option>
            {Object.entries(warningLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>

      {p.selected.size > 0 && (
        <div className="adm-bulk" role="toolbar" aria-label="Ações em lote">
          <span>{plural(p.selected.size)} selecionado(s)</span>
          {bulkActions.map((a) => (
            <button
              key={a.key}
              type="button"
              className="adm-btn"
              disabled={p.selected.size > BULK_MAX || p.bulkBusy}
              onClick={() => p.onBulkRequest(a.key)}
            >
              {a.label}
            </button>
          ))}
          {p.selected.size > BULK_MAX && (
            <p className="adm-field-error" role="alert">
              Selecione no máximo {BULK_MAX} produtos por ação.
            </p>
          )}
        </div>
      )}
      <ConfirmDialog
        open={p.pendingAction !== null}
        title={p.pendingAction ? bulkTitle(p.pendingAction, p.selected.size) : ""}
        message={
          p.pendingAction === "confirm_pricing"
            ? "Confirma as variações aguardando preços com a tabela atual. Nada é gravado no Bling."
            : "A alteração vale para todos os produtos selecionados."
        }
        busy={p.bulkBusy}
        onConfirm={p.onBulkConfirm}
        onCancel={p.onBulkCancel}
      />
      {p.error && p.items.length === 0 ? (
        <ErrorState error={p.error} onRetry={p.onRetry} />
      ) : (
        <>
          <DataTable
            caption="Produtos"
            columns={columns}
            rows={p.items}
            rowKey={(row) => row.id}
            selectable
            selected={p.selected}
            onSelectedChange={p.onSelectedChange}
            loading={p.loading}
            sort={sort}
            onSortChange={(next) =>
              p.onChange({ sort: next.key as ProductSortKey, order: next.order })
            }
            empty={
              <EmptyState
                title="Nenhum produto encontrado"
                action={
                  dirty ? (
                    <button type="button" className="adm-btn" onClick={p.onClear}>
                      Limpar filtros
                    </button>
                  ) : undefined
                }
              >
                {dirty
                  ? "Nenhum produto corresponde aos filtros aplicados."
                  : "Ainda não há produtos importados do Bling."}
              </EmptyState>
            }
          />
          {p.items.length > 0 && (
            <Pagination
              total={p.total}
              skip={skip}
              limit={PAGE_SIZE}
              disabled={p.loading}
              onChange={(next) => p.onChange({ skip: String(next) })}
            />
          )}
        </>
      )}
    </section>
  );
}
