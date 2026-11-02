import { formatVariationName } from "../../../shared/variation";
import { type Column, DataTable } from "../../ui/DataTable";
import { Tabs } from "../../ui/Tabs";
import { useState } from "react";
import { Link } from "react-router";
import type { AdminProductDetail, AdminVariant } from "../../api/types";
import { sanitizeHtml } from "../../../shared/sanitize-html";
import { PresentationForm } from "./PresentationForm";
import { PricingTab } from "./PricingEditor";
import { StoreLinkStatus } from "./StoreLinkStatus";
import { formatBRL, pendingLabels } from "./format";

const num = (value: number | null, unit: string) => (value === null ? "—" : `${value} ${unit}`);
const dt = (value: string | null) => (value ? new Date(value).toLocaleString("pt-BR") : "—");

const FromBling = () => (
  <span className="adm-badge" data-tone="info">
    vem do Bling
  </span>
);

const variantColumns: Column<AdminVariant>[] = [
  {
    key: "variation",
    card: "title",
    header: "Variação",
    width: 240,
    render: (v) => (
      <>
        {formatVariationName(v.variation_name)}
        <div className="adm-muted">
          SKU {v.bling_sku}
          {v.gtin ? ` · GTIN ${v.gtin}` : ""}
        </div>
      </>
    ),
  },
  {
    key: "price",
    card: "field",
    header: "Preço",
    width: 120,
    align: "right",
    render: (v) => formatBRL(v.base_price),
  },
  {
    key: "stock",
    header: "Estoque",
    width: 100,
    card: "field",
    align: "right",
    render: (v) => v.stock_quantity,
  },
  {
    key: "weight",
    card: "field",
    header: "Peso",
    width: 100,
    align: "right",
    render: (v) => num(v.weight_kg, "kg"),
  },
  {
    key: "size",
    card: "field",
    header: "Medidas (C × L × A)",
    width: 200,
    render: (v) =>
      `${num(v.length_cm, "cm")} × ${num(v.width_cm, "cm")} × ${num(v.height_cm, "cm")}`,
  },
  {
    key: "status",
    card: "field",
    header: "Situação",
    width: 180,
    render: (v) => (
      <>
        {v.is_active ? (
          <span className="adm-badge" data-tone="success">
            À venda
          </span>
        ) : (
          <span className="adm-badge" data-tone="warning">
            Fora de venda
          </span>
        )}
        {v.pending_reason && (
          <div className="adm-muted">
            Motivo: {pendingLabels[v.pending_reason] ?? v.pending_reason}
          </div>
        )}
      </>
    ),
  },
  {
    key: "store",
    card: "field",
    header: "Loja do site",
    width: 200,
    render: (v) => <StoreLinkStatus variant={v} />,
  },
];

export function BlingTab({ product }: { product: AdminProductDetail }) {
  const images = product.images.length
    ? product.images.map((url) => ({ url, sku: product.code }))
    : product.variants.flatMap((v) => v.images.map((url) => ({ url, sku: v.bling_sku })));
  return (
    <div role="tabpanel" aria-label="Bling" className="adm-stack">
      <section className="adm-card" aria-labelledby="bling-data">
        <h2 id="bling-data">
          Dados <FromBling />
        </h2>
        <dl className="adm-dl">
          <dt>Nome no Bling</dt>
          <dd>{product.name || "—"}</dd>
          <dt>Código</dt>
          <dd>{product.code}</dd>
          <dt>ID no Bling</dt>
          <dd>{product.bling_id}</dd>
          <dt>Marca</dt>
          <dd>{product.brand ?? "—"}</dd>
          <dt>Unidade</dt>
          <dd>{product.unit ?? "—"}</dd>
          <dt>Situação</dt>
          <dd>{product.is_active ? "À venda" : "Fora de venda"}</dd>
          <dt>Categorias</dt>
          <dd>
            {product.categories.length ? product.categories.map((c) => c.name).join(", ") : "—"}
          </dd>
          <dt>Atualizado no Bling</dt>
          <dd>{dt(product.bling_updated_at)}</dd>
        </dl>
        {[product.description, product.complementary_description].map(
          (html, index) =>
            html?.trim() && (
              <div
                key={index === 0 ? "description" : "complementary"}
                // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML sanitizado por DOMPurify (tags de texto, sem atributos).
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
              />
            ),
        )}
        <p className="adm-muted">Nome, descrição, imagens e categorias: edite no Bling.</p>
      </section>

      <section className="adm-card" aria-labelledby="bling-variants">
        <h2 id="bling-variants">
          Variações <FromBling />
        </h2>
        <DataTable
          caption="Variações"
          storageKey="produto-variacoes"
          columns={variantColumns}
          rows={product.variants}
          rowKey={(v) => v.id}
        />
      </section>

      <section className="adm-card" aria-labelledby="bling-images">
        <h2 id="bling-images">
          Imagens <FromBling />
        </h2>
        {images.length === 0 ? (
          <p>Sem imagens.</p>
        ) : (
          <ul className="adm-gallery">
            {images.map((img) => (
              <li key={`${img.sku}-${img.url}`}>
                <img src={img.url} alt={`Imagem da variação ${img.sku}`} loading="lazy" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const PRODUCT_TABS = [
  ["bling", "Bling"],
  ["store", "Loja"],
  ["prices", "Preços"],
] as const;

export function ProductDetailView({ product }: { product: AdminProductDetail }) {
  const [tab, setTab] = useState<"bling" | "store" | "prices">("bling");
  const name = product.name || product.code;
  return (
    <section aria-labelledby="adm-page-title">
      <div className="adm-page-header">
        <h1 id="adm-page-title">{name}</h1>
        <Link to="/produtos">Voltar para produtos</Link>
      </div>
      <Tabs<"bling" | "store" | "prices">
        label="Seções do produto"
        tabs={PRODUCT_TABS}
        active={tab}
        onSelect={setTab}
      />
      {tab === "bling" && <BlingTab product={product} />}
      {tab === "store" && <PresentationForm product={product} />}
      {tab === "prices" && <PricingTab product={product} />}
    </section>
  );
}
