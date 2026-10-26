import { BlingConnection } from "./BlingConnection";
import { CatalogSync } from "./CatalogSync";

/** Servida em /bling e em /integracoes/bling?resultado=... (retorno do OAuth). */
export function BlingPage() {
  return (
    <>
      <BlingConnection />
      <CatalogSync />
    </>
  );
}
