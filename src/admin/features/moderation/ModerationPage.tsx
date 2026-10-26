import { useUrlState } from "../../ui/useUrlState";
import { QuestionsQueue } from "./QuestionsQueue";
import { ReviewsQueue } from "./ReviewsQueue";

export const PAGE_SIZE = 20;

const TABS = [
  ["avaliacoes", "Avaliações"],
  ["perguntas", "Perguntas"],
] as const;

export const REVIEW_STATUSES = [
  ["pending", "Pendentes"],
  ["approved", "Aprovadas"],
  ["all", "Todas"],
] as const;
export const QUESTION_STATUSES = [
  ["unanswered", "Sem resposta"],
  ["answered", "Respondidas"],
  ["all", "Todas"],
] as const;

export const toSkip = (value: string) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export function ModerationPage() {
  const [state, update] = useUrlState({ aba: "avaliacoes", status: "", skip: "0" });
  const tab = state.aba === "perguntas" ? "perguntas" : "avaliacoes";
  const skip = toSkip(state.skip);
  const onSkip = (next: number) => update({ skip: String(next) });

  return (
    <section aria-labelledby="adm-page-title">
      <div className="adm-page-header">
        <h1 id="adm-page-title">Moderação</h1>
      </div>
      <div role="tablist" aria-label="Seções de moderação" className="adm-tabs">
        {TABS.map(([key, text]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className="adm-tab"
            onClick={() => update({ aba: key, status: "", skip: "0" })}
          >
            {text}
          </button>
        ))}
      </div>
      {tab === "perguntas" ? (
        <QuestionsQueue
          status={QUESTION_STATUSES.find(([k]) => k === state.status)?.[0] ?? "unanswered"}
          skip={skip}
          onStatus={(status) => update({ status })}
          onSkip={onSkip}
        />
      ) : (
        <ReviewsQueue
          status={REVIEW_STATUSES.find(([k]) => k === state.status)?.[0] ?? "pending"}
          skip={skip}
          onStatus={(status) => update({ status })}
          onSkip={onSkip}
        />
      )}
    </section>
  );
}
