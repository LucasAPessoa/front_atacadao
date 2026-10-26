import { Tabs } from "../../ui/Tabs";
import { toInt, useUrlState } from "../../ui/useUrlState";
import { BlingConnection } from "./BlingConnection";
import { CatalogSync } from "./CatalogSync";
import { PendingList, toReason } from "./PendingList";

const BLING_TABS = [
  ["integracao", "Conexão e importação"],
  ["pendencias", "Pendências"],
] as const;

/** Servida em /bling e em /integracoes/bling?resultado=... (retorno do OAuth). */
export function BlingPage() {
  // `resultado` (retorno do OAuth) e demais chaves da URL são preservadas pelo useUrlState.
  const [state, update] = useUrlState({ aba: "integracao", motivo: "", skip: "0" });
  const tab = state.aba === "pendencias" ? "pendencias" : "integracao";
  return (
    <>
      <Tabs
        label="Seções do Bling"
        tabs={BLING_TABS}
        active={tab}
        onSelect={(key) => update({ aba: key, motivo: "", skip: "0" })}
      />
      {tab === "pendencias" ? (
        <PendingList
          reason={toReason(state.motivo)}
          skip={toInt(state.skip, 0)}
          onReason={(motivo) => update({ motivo })}
          onSkip={(skip) => update({ skip: String(skip) })}
        />
      ) : (
        <>
          <BlingConnection />
          <CatalogSync />
        </>
      )}
    </>
  );
}
