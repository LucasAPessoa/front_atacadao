import { toInt, useUrlState } from "../../ui/useUrlState";
import { BlingConnection } from "./BlingConnection";
import { CatalogSync } from "./CatalogSync";
import { PendingList, toReason } from "./PendingList";

/** Servida em /bling e em /integracoes/bling?resultado=... (retorno do OAuth). */
export function BlingPage() {
  // `resultado` (retorno do OAuth) e demais chaves da URL são preservadas pelo useUrlState.
  const [state, update] = useUrlState({ aba: "integracao", motivo: "", skip: "0" });
  const tab = state.aba === "pendencias" ? "pendencias" : "integracao";
  return (
    <>
      <div role="tablist" aria-label="Seções do Bling" className="adm-tabs">
        {(
          [
            ["integracao", "Conexão e importação"],
            ["pendencias", "Pendências"],
          ] as const
        ).map(([key, text]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className="adm-tab"
            onClick={() => update({ aba: key, motivo: "", skip: "0" })}
          >
            {text}
          </button>
        ))}
      </div>
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
