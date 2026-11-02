import type { AdminVariant } from "../../api/types";
import { formatBRL } from "./format";
import { storeLinkLabels } from "./pricing";

/** Estado do vínculo da variação com a loja do site no Bling, com o preço do vínculo. */
export function StoreLinkStatus({ variant }: { variant: AdminVariant }) {
  const linked = variant.store_link !== "none";
  return (
    <span>
      <span className="adm-badge" data-tone={linked ? "success" : "warning"}>
        {storeLinkLabels[variant.store_link]}
      </span>
      {linked && variant.store_price !== null && (
        <span className="adm-muted" style={{ whiteSpace: "nowrap" }}>
          {" "}
          · {formatBRL(variant.store_price)} na loja
        </span>
      )}
    </span>
  );
}
