import { useState } from "react";
import { Link } from "react-router";
import type { AdminProductDetail, AdminVariant } from "../../api/types";
import { PresentationForm } from "./PresentationForm";
import { PricingTiersEditor } from "./PricingTiersEditor";
import { VariantPriceEditor } from "./VariantPriceEditor";
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
  const images = product.variants.flatMap((v) =>
    v.images.map((url) => ({ url, sku: v.bling_sku })),
  );
  return (
    <div role="tabpanel" aria-label="Bling" className="adm-stack">
      <section className="adm-card" aria-labelledby="bling-data">
        <h2 id="bling-data">
          Dados <FromBling />
        </h2>
        <dl className="adm-dl">
          <dt>Nome no Bling</dt>
          <dd>{product.presentation.name.bling ?? "—"}</dd>
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
          <dt>Atualizado no Bling</dt>
          <dd>{dt(product.bling_updated_at)}</dd>
        </dl>
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

export function ProductDetailView({ product }: { product: AdminProductDetail }) {
  const [tab, setTab] = useState<"bling" | "store" | "prices">("bling");
  const name = product.presentation.name.site ?? product.presentation.name.bling ?? product.code;
  return (
    <section aria-labelledby="adm-page-title">
      <div className="adm-page-header">
        <h1 id="adm-page-title">{name}</h1>
        <Link to="/produtos">Voltar para produtos</Link>
      </div>
      <div role="tablist" aria-label="Seções do produto" className="adm-tabs">
        {(
          [
            ["bling", "Bling"],
            ["store", "Loja"],
            ["prices", "Preços"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className="adm-tab"
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "bling" && <BlingTab product={product} />}
      {tab === "store" && <PresentationForm product={product} />}
      {tab === "prices" && (
        <div role="tabpanel" aria-label="Preços" className="adm-stack">
          <VariantPriceEditor productId={product.id} variants={product.variants} />
          <PricingTiersEditor productId={product.id} tiers={product.pricing_tiers} />
        </div>
      )}
    </section>
  );
}
