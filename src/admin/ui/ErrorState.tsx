import { errorMessage } from "./errors";

export function ErrorState({
  error,
  title = "Não foi possível carregar",
  onRetry,
}: {
  error: unknown;
  title?: string;
  onRetry?(): void;
}) {
  return (
    <div className="adm-state adm-state-error" role="alert">
      <h2>{title}</h2>
      <p>{errorMessage(error)}</p>
      {onRetry && (
        <button type="button" className="adm-btn" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
