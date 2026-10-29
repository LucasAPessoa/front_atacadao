import { Tabs } from "../../ui/Tabs";
import { useState } from "react";
import { Link } from "react-router";
import type { AdminProductDetail, AdminVariant } from "../../api/types";
import { sanitizeHtml } from "../../../shared/sanitize-html";
import { PresentationForm } from "./PresentationForm";
import { PricingTab } from "./PricingEditor";
import { formatBRL, pendingLabels } from "./format";

const num = (value: number | null, unit: string) => (value === null ? "—" : `${value} ${unit}`);
const dt = (value: string | null) => (value ? new Date(value).toLocaleString("pt-BR") : "—");

const FromBling = () => (
  <span className="adm-badge" data-tone="info">
    vem do Bling
  </span>
);

function VariantRow({ v }: { v: AdminVariant }) {
  return (
    <tr>
      <td>
        {v.variation_name}
        <div className="adm-muted">
          SKU {v.bling_sku}
          {v.gtin ? ` · GTIN ${v.gtin}` : ""}
        </div>
      </td>
      <td className="adm-num">{formatBRL(v.base_price)}</td>
      <td className="adm-num">{v.stock_quantity}</td>
      <td className="adm-num">{num(v.weight_kg, "kg")}</td>
      <td>
        {num(v.length_cm, "cm")} × {num(v.width_cm, "cm")} × {num(v.height_cm, "cm")}
      </td>
      <td>
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
      </td>
    </tr>
  );
}

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
        <div className="adm-table-wrap">
          <table className="adm-table">
            <caption className="adm-sr-only">Variações</caption>
            <thead>
              <tr>
                <th scope="col">Variação</th>
                <th scope="col" className="adm-num">
                  Preço
                </th>
                <th scope="col" className="adm-num">
                  Estoque
                </th>
                <th scope="col" className="adm-num">
                  Peso
                </th>
                <th scope="col">Medidas (C × L × A)</th>
                <th scope="col">Situação</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((v) => (
                <VariantRow key={v.id} v={v} />
              ))}
            </tbody>
          </table>
        </div>
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
